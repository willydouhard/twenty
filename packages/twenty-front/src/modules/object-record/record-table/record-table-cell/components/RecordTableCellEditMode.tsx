import { useIsFieldInputOnly } from '@/object-record/record-field/ui/hooks/useIsFieldInputOnly';
import { RecordFieldComponentInstanceContext } from '@/object-record/record-field/ui/states/contexts/RecordFieldComponentInstanceContext';
import { recordFieldInputIsFieldInErrorComponentState } from '@/object-record/record-field/ui/states/recordFieldInputIsFieldInErrorComponentState';
import { recordFieldInputLayoutDirectionComponentState } from '@/object-record/record-field/ui/states/recordFieldInputLayoutDirectionComponentState';
import { recordFieldInputLayoutDirectionLoadingComponentState } from '@/object-record/record-field/ui/states/recordFieldInputLayoutDirectionLoadingComponentState';
import { RecordTableCellContext } from '@/object-record/record-table/contexts/RecordTableCellContext';
import { useFocusRecordTableCell } from '@/object-record/record-table/record-table-cell/hooks/useFocusRecordTableCell';
import { RECORD_TABLE_HTML_ID } from '@/object-record/record-table/constants/RecordTableHtmlId';
import { getRecordTableColumnFieldWidthCSSVariableName } from '@/object-record/record-table/utils/getRecordTableColumnFieldWidthCSSVariableName';
import { OverlayContainer } from '@/ui/layout/overlay/components/OverlayContainer';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { useRecoilComponentValue } from '@/ui/utilities/state/component-state/hooks/useRecoilComponentValue';
import { useSetRecoilComponentState } from '@/ui/utilities/state/component-state/hooks/useSetRecoilComponentState';
import styled from '@emotion/styled';
import {
  autoUpdate,
  flip,
  offset,
  useFloating,
  type MiddlewareState,
} from '@floating-ui/react';
import { useContext, useMemo, type ReactElement } from 'react';

const StyledEditableCellEditModeContainer = styled.div<{
  isFieldInputOnly: boolean;
}>`
  align-items: center;
  display: flex;
  height: 100%;
  position: absolute;
  width: calc(100% + 2px);
`;

const StyledInputModeOnlyContainer = styled.div`
  align-items: center;
  display: flex;
  height: 100%;
  overflow: hidden;
  padding-left: 8px;
  width: 100%;
`;

export type RecordTableCellEditModeProps = {
  children: ReactElement;
};

export const RecordTableCellEditMode = ({
  children,
}: RecordTableCellEditModeProps) => {
  const isFieldInError = useRecoilComponentValue(
    recordFieldInputIsFieldInErrorComponentState,
  );

  const recordFieldComponentInstanceId = useAvailableComponentInstanceIdOrThrow(
    RecordFieldComponentInstanceContext,
  );
  const setFieldInputLayoutDirection = useSetRecoilComponentState(
    recordFieldInputLayoutDirectionComponentState,
    recordFieldComponentInstanceId,
  );

  const setFieldInputLayoutDirectionLoading = useSetRecoilComponentState(
    recordFieldInputLayoutDirectionLoadingComponentState,
    recordFieldComponentInstanceId,
  );

  const setFieldInputLayoutDirectionMiddleware = {
    name: 'middleware',
    fn: async (state: MiddlewareState) => {
      setFieldInputLayoutDirection(
        state.placement.startsWith('bottom') ? 'downward' : 'upward',
      );
      setFieldInputLayoutDirectionLoading(false);
      return {};
    },
  };

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    middleware: [
      flip(),
      offset({
        mainAxis: -33,
        crossAxis: -3,
      }),
      setFieldInputLayoutDirectionMiddleware,
    ],

    whileElementsMounted: autoUpdate,
  });

  const isFieldInputOnly = useIsFieldInputOnly();

  const { cellPosition } = useContext(RecordTableCellContext);

  const { focusRecordTableCell } = useFocusRecordTableCell();

  const floatingStylesWithWidth = useMemo(() => {
    const recordTableElement = document.querySelector<HTMLDivElement>(
      `#${RECORD_TABLE_HTML_ID}`,
    );

    if (!recordTableElement) {
      return floatingStyles;
    }

    const columnWidthCSSVariable =
      getRecordTableColumnFieldWidthCSSVariableName(cellPosition.column);
    const columnWidthValue = getComputedStyle(
      recordTableElement,
    ).getPropertyValue(columnWidthCSSVariable);

    const columnWidthPx = parseFloat(columnWidthValue);

    if (!columnWidthPx || isNaN(columnWidthPx)) {
      return floatingStyles;
    }

    const floatingInputWidth = Math.min(columnWidthPx * 1.24, 340);

    return {
      ...floatingStyles,
      width: `${floatingInputWidth}px`,
      maxWidth: '340px',
    };
  }, [floatingStyles, cellPosition.column]);

  return (
    <StyledEditableCellEditModeContainer
      ref={refs.setReference}
      data-testid="editable-cell-edit-mode-container"
      isFieldInputOnly={isFieldInputOnly}
    >
      {isFieldInputOnly ? (
        <StyledInputModeOnlyContainer
          onClick={() => {
            focusRecordTableCell(cellPosition);
          }}
        >
          {children}
        </StyledInputModeOnlyContainer>
      ) : (
        <OverlayContainer
          ref={refs.setFloating}
          style={floatingStylesWithWidth}
          borderRadius="sm"
          hasDangerBorder={isFieldInError}
        >
          {children}
        </OverlayContainer>
      )}
    </StyledEditableCellEditModeContainer>
  );
};
