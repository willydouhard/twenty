import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { MAX_SEARCH_RESULTS } from '@/command-menu/constants/MaxSearchResults';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useDoObjectMetadataItemsExist } from '@/object-metadata/hooks/useDoObjectMetadataItemsExist';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { type WatchQueryFetchPolicy } from '@apollo/client';
import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import {
  isDefined,
  resolveRelativeDatesInObjectRecordFilter,
} from 'twenty-shared/utils';
import {
  type ObjectRecordFilterInput,
  useSearchQuery,
} from '~/generated/graphql';
import { logError } from '~/utils/logError';

// maybe we should look at ObjectMetadataItemIdentifier to update the API even though there are many location to update
export type UseSearchRecordsParams = {
  objectNameSingulars: string[];
  limit?: number;
  onError?: (error?: Error) => void;
  skip?: boolean;
  fetchPolicy?: WatchQueryFetchPolicy;
  searchInput?: string;
  filter?: ObjectRecordFilterInput;
};

export const useObjectRecordSearchRecords = ({
  objectNameSingulars,
  searchInput,
  limit,
  skip,
  filter,
  fetchPolicy,
}: UseSearchRecordsParams) => {
  const currentWorkspaceMember = useRecoilValue(currentWorkspaceMemberState);
  const areDefined = useDoObjectMetadataItemsExist(objectNameSingulars);

  const { enqueueErrorSnackBar } = useSnackBar();
  const apolloCoreClient = useApolloCoreClient();

  const { objectMetadataItems } = useObjectMetadataItems();

  const allFieldMetadataItems = useMemo(() => {
    return objectMetadataItems
      .filter((item) => objectNameSingulars.includes(item.nameSingular))
      .flatMap((item) => item.fields)
      .map((field) => ({
        id: field.id,
        name: field.name,
        type: field.type,
        label: field.label,
      }));
  }, [objectMetadataItems, objectNameSingulars]);

  const resolvedFilter = useMemo(() => {
    if (!filter || !allFieldMetadataItems.length) {
      return filter;
    }
    return resolveRelativeDatesInObjectRecordFilter(
      filter,
      allFieldMetadataItems,
    );
  }, [filter, allFieldMetadataItems]);

  const { data, loading, error, previousData } = useSearchQuery({
    skip:
      skip || !areDefined || !currentWorkspaceMember || !isDefined(searchInput),
    variables: {
      searchInput: searchInput ?? '',
      limit: limit ?? MAX_SEARCH_RESULTS,
      filter: resolvedFilter ?? {},
      includedObjectNameSingulars: objectNameSingulars,
    },
    fetchPolicy: fetchPolicy,
    client: apolloCoreClient,
    onError: (error) => {
      logError(
        `useSearchRecords for "${objectNameSingulars.join(', ')}" error : ` +
          error,
      );
      enqueueErrorSnackBar({
        apolloError: error,
      });
    },
  });

  const effectiveData = loading ? previousData : data;

  const searchRecords = useMemo(
    () => effectiveData?.search.edges.map((edge) => edge.node) || [],
    [effectiveData],
  );

  return {
    searchRecords,
    loading,
    error,
  };
};
