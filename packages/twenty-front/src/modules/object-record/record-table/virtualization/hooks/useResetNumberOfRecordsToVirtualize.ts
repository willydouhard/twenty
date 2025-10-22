import { totalNumberOfRecordsToVirtualizeComponentState } from '@/object-record/record-table/virtualization/states/totalNumberOfRecordsToVirtualizeComponentState';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { useRecoilComponentCallbackState } from '@/ui/utilities/state/component-state/hooks/useRecoilComponentCallbackState';
import { getSnapshotValue } from '@/ui/utilities/state/utils/getSnapshotValue';
import { useRecoilCallback } from 'recoil';

export const useResetNumberOfRecordsToVirtualize = () => {
  const totalNumberOfRecordsToVirtualizeCallbackState =
    useRecoilComponentCallbackState(
      totalNumberOfRecordsToVirtualizeComponentState,
    );

  const resetNumberOfRecordsToVirtualize = useRecoilCallback(
    ({ snapshot, set }) =>
      ({
        _records,
        totalCount,
      }: {
        _records: ObjectRecord[];
        totalCount: number;
      }) => {
        const totalNumberOfRecordsToVirtualize = getSnapshotValue(
          snapshot,
          totalNumberOfRecordsToVirtualizeCallbackState,
        );

        // Use totalCount (not records.length) to ensure proper virtualization
        // across all record counts, preventing pagination display issues
        if (totalNumberOfRecordsToVirtualize !== totalCount) {
          set(totalNumberOfRecordsToVirtualizeCallbackState, totalCount);
        }
      },
    [totalNumberOfRecordsToVirtualizeCallbackState],
  );

  return {
    resetNumberOfRecordsToVirtualize,
  };
};
