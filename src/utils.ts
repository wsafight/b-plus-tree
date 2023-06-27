export const defaultSort = <T>(pre: T, next: T): number => {
  if (pre < next) {
    return -1;
  } else if (pre > next) {
    return 1;
  }
  return 0;
};

export const getUid = () => `${(Math.random() + 1).toString(36).substring(2)}`;

export interface BinarySearchParams<T> {
  array: T[];
  value: T;
  sortFun?: null | ((pre: T, next: T) => number);
}

export interface BinarySearchResult {
  index: number;
  found: boolean;
}

export const binarySearch = <T>({
  array,
  value,
  sortFun = null,
}: BinarySearchParams<T>): BinarySearchResult => {
  if (!Array.isArray(array) || array.length === 0) {
    return {
      found: false,
      index: 0,
    };
  }
  let low = 0;
  let hight = array.length;
  let finalSortFun = defaultSort<T>;
  if (typeof sortFun === 'function') {
    finalSortFun = sortFun;
  }
  while (low < hight) {
    const mid = low + Math.floor((hight - low) / 2);
    const compared = finalSortFun(value, array[mid]);
    if (compared === 0) {
      return {
        found: true,
        index: mid,
      };
    } else if (compared < 0) {
      hight = mid;
    } else {
      low = mid + 1;
    }
  }
  return {
    found: false,
    index: hight,
  };
};
