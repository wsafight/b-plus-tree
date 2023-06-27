import { BinarySearchResult, binarySearch, getUid } from './utils';

export const detectKey = (node: TreeNode): any => {
  if (node.hasChildren()) {
    return detectKey(node.children[0]);
  } else {
    return node.keys[0];
  }
};

interface TreeStruct {
  id: string;
  keys: any[];
  values: any[];
  prev: any;
  next: any;
  children: TreeStruct[];
}

export const dumpTree = (node: TreeNode): TreeStruct => {
  const current = node;
  const struct: TreeStruct = {
    id: current.id,
    keys: current.keys,
    values: current.values,
    prev: current.prev ? current.prev.id : null,
    next: current.next ? current.next.id : null,
    children: [],
  };

  for (const child of current.children) {
    struct.children.push(dumpTree(child));
  }
  return struct;
};

export class TreeNode {
  readonly id: string = getUid();

  parent: any = null;

  prev: any = null;

  next: any = null;

  children: TreeNode[] = [];

  keys: any[] = [];

  values: any[] = [];

  injectData(key: any, val: any): void {
    if (typeof val === 'undefined') {
      return;
    }
    const keySearchResult = binarySearch({
      array: this.keys,
      value: key,
    });
    if (keySearchResult.found) {
      const dataSearchResult = binarySearch({
        array: this.values[keySearchResult.index],
        value: val,
      });
      this.values[keySearchResult.index].splice(dataSearchResult.index, 0, val);
    } else {
      this.keys.splice(keySearchResult.index, 0, key);
      this.values.splice(keySearchResult.index, 0, [val]);
    }
  }

  ejectData(key: any, val: any): BinarySearchResult {
    const keySearchResult = binarySearch({
      array: this.keys,
      value: key,
    });

    if (!keySearchResult.found) {
      return keySearchResult;
    }

    const keyIndex = keySearchResult.index;

    if (typeof val === 'undefined') {
      this.keys.splice(keyIndex, 1);
      this.values.splice(keyIndex, 1);
      return keySearchResult;
    }
    const valueSearchResult = binarySearch({
      array: this.values[keyIndex],
      value: val,
    });
    if (!valueSearchResult.found) {
      return keySearchResult;
    }
    const valueIndex = valueSearchResult.index;
    this.values[keyIndex].splice(valueIndex, 1);

    if (this.values[keyIndex].length === 0) {
      this.keys.splice(keyIndex, 1);
      this.values.splice(keyIndex, 1);
    }
    return valueSearchResult;
  }

  get(key: any) {
    const { found, index } = binarySearch({
      array: this.keys,
      value: key,
    });
    if (!found) {
      return [];
    }
    return this.values[index];
  }

  size() {
    return this.keys.length;
  }

  hasChildren() {
    return this.children.length > 0;
  }

  setParentOnChildren() {
    for (const child of this.children) {
      child.parent = this;
    }
  }

  replaceKey(key: any, newKey: any) {
    const { found, index } = binarySearch({
      array: this.keys,
      value: key,
    });

    if (found) {
      this.keys[index] = newKey;
    }

    if (this.parent) {
      this.parent.replaceKey(key, newKey);
    }
  }

  updateKeys() {
    if (!this.hasChildren()) {
      return;
    }
    const keys = [];
    for (let i = 1; i < this.children.length; i++) {
      const child = this.children[i];
      keys.push(detectKey(child));
    }
    if (keys.length > 0) {
      this.keys = keys;
    }
  }
}
