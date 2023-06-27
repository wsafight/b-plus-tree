import { TreeNode, detectKey, dumpTree } from './tree-node';
import { binarySearch } from './utils';

class BPlusTree {
  root: TreeNode = new TreeNode();

  readonly branchingFactor: number = 50;

  constructor({ branchingFactor = 50 } = { branchingFactor: 50 }) {
    this.branchingFactor = branchingFactor;
  }

  dumpTree(leaf: TreeNode) {
    dumpTree(leaf || this.root);
  }

  get(key: any) {
    return this._findLeaf(key).get(key);
  }

  getAll(opts = {}) {
    const options = { sortDescending: false, ...opts };
    const startLeaf = this._findLeaf(detectKey(this.root));
    let currLoc: null | Record<string, any> = { index: 0, leaf: startLeaf };
    let result: any[] = [];

    while (currLoc !== null) {
      result = result.concat(currLoc.leaf.values[currLoc.index]);
      currLoc = this._stepForward(currLoc.index, currLoc.leaf);
    }

    if (options.sortDescending) {
      result.reverse();
    }

    return result;
  }

  getRange(lowerBound: number, upperBound: number, opts = {}) {
    const options = {
      lowerInclusive: true,
      upperInclusive: false,
      sortDescending: false,
      ...opts,
    };
    let result: any[] = [];

    const startLeaf = this._findLeaf(lowerBound);

    const keySearchResult = binarySearch({
      array: startLeaf.keys,
      value: lowerBound,
    });
    let currLoc: any = { index: keySearchResult.index, leaf: startLeaf };

    if (keySearchResult.index >= startLeaf.keys.length) {
      currLoc = this._stepForward(currLoc.index, currLoc.leaf);
    }

    if (keySearchResult.found && options.lowerInclusive === false) {
      currLoc = this._stepForward(currLoc.index, currLoc.leaf);
    }

    while (currLoc.leaf.keys[currLoc.index] < upperBound) {
      result = result.concat(currLoc.leaf.values[currLoc.index]);
      currLoc = this._stepForward(currLoc.index, currLoc.leaf);
    }

    if (
      currLoc.leaf.keys[currLoc.index] <= upperBound &&
      options.upperInclusive === true
    ) {
      result = result.concat(currLoc.leaf.values[currLoc.index]);
    }

    if (options.sortDescending === true) {
      result.reverse();
    }

    return result;
  }

  inject(key: any, val: any) {
    const leaf = this._findLeaf(key);
    leaf.injectData(key, val);
    this._splitLeaf(leaf);
  }

  eject(key: any, val: any) {
    const leaf = this._findLeaf(key);
    const loc = leaf.ejectData(key, val);
    if (loc.found && loc.index === 0 && leaf.parent) {
      if (leaf.keys.length > 0 && key !== leaf.keys[0]) {
        leaf.parent.replaceKey(key, leaf.keys[0]);
      }
    }
    this._mergeLeaf(leaf);
  }

  private _stepForward(index: number, leaf: TreeNode) {
    if (index + 1 < leaf.keys.length) {
      return { index: index + 1, leaf };
    } else if (leaf.next) {
      return { index: 0, leaf: leaf.next };
    } else {
      return null;
    }
  }

  _stepBackward(index: number, leaf: TreeNode) {
    if (index - 1 < 0) {
      return { index: index - 1, leaf };
    }
    if (leaf.prev) {
      return { index: leaf.prev.keys.length - 1, leaf: leaf.prev };
    }
    return null;
  }

  _minKeys() {
    return Math.floor(this.branchingFactor / 2);
  }

  private _maxKeys() {
    return this.branchingFactor - 1;
  }

  private _findLeaf(key: any, leaf?: TreeNode): any {
    const current = leaf || this.root;
    if (current.children.length === 0) {
      return current;
    } else {
      const { found, index } = binarySearch({
        array: current.keys,
        value: key,
      });
      const finalIndex = found ? index + 1 : index;
      return this._findLeaf(key, current.children[finalIndex]);
    }
  }

  _splitLeaf(leaf: TreeNode) {
    if (leaf.size() > this._maxKeys()) {
      const splitPoint = Math.floor(leaf.size() / 2);

      let { parent } = leaf;
      const { prev } = leaf;
      const { next } = leaf;
      const { children } = leaf;
      const { keys } = leaf;
      const { values } = leaf;

      const leftLeaf = new TreeNode();
      const rightLeaf = new TreeNode();

      if (prev != null) {
        prev.next = leftLeaf;
      }
      if (next != null) {
        next.prev = rightLeaf;
      }

      leftLeaf.parent = parent;
      leftLeaf.children = children.slice(0, splitPoint);
      leftLeaf.keys = keys.slice(0, splitPoint);
      leftLeaf.values = values.slice(0, splitPoint);

      rightLeaf.parent = parent;
      rightLeaf.children = children.slice(splitPoint);
      rightLeaf.keys = keys.slice(splitPoint);
      rightLeaf.values = values.slice(splitPoint);

      // In a B+tree only leaves contain data, everything else is a node

      if (leaf === this.root) {
        // If we are splitting the root
        if (leaf.values.length > 0) {
          // If the root is also a leaf (has data)
          this.root = new TreeNode();
          parent = this.root;
          parent.children = [leftLeaf, rightLeaf];
          parent.keys = [keys[splitPoint]];
          leftLeaf.parent = parent;
          rightLeaf.parent = parent;
          leftLeaf.next = rightLeaf;
          rightLeaf.prev = leftLeaf;
        } else {
          // If the root is a node)
          this.root = new TreeNode();
          parent = this.root;
          parent.children = [leftLeaf, rightLeaf];
          parent.keys = [keys[splitPoint]];
          leftLeaf.parent = parent;
          leftLeaf.children = children.slice(0, splitPoint + 1);
          leftLeaf.setParentOnChildren();

          rightLeaf.parent = parent;
          rightLeaf.keys = keys.slice(splitPoint + 1);
          rightLeaf.children = children.slice(splitPoint + 1);
          rightLeaf.setParentOnChildren();
        }
      } else {
        // If we are not splitting root

        const childPos: number = parent.children.indexOf(leaf);

        if (leaf.values.length > 0) {
          // If we are splitting a leaf

          if (childPos !== 0) {
            parent.keys[childPos - 1] = leftLeaf.keys[0];
          }
          parent.children[childPos] = leftLeaf;

          parent.keys.splice(childPos, 0, rightLeaf.keys[0]);
          parent.children.splice(childPos + 1, rightLeaf);

          leftLeaf.prev = leaf.prev;
          leftLeaf.next = rightLeaf;
          rightLeaf.prev = leftLeaf;
          rightLeaf.next = leaf.next;

          this._splitLeaf(parent);
        } else {
          // If we are splitting a node

          rightLeaf.keys = keys.slice(splitPoint + 1);
          leftLeaf.children = children.slice(0, splitPoint + 1);
          leftLeaf.setParentOnChildren();
          rightLeaf.children = children.slice(splitPoint + 1);
          rightLeaf.setParentOnChildren();

          parent.children[childPos] = leftLeaf;

          parent.keys[childPos] = keys[splitPoint];
          parent.children[childPos + 1] = rightLeaf;
          this._splitLeaf(parent);
        }
      }
    }
  }

  _mergeLeaf(leaf: TreeNode) {
    if (leaf.hasChildren()) {
      if (leaf.children.length > this._minKeys()) {
        if (leaf.children.length > leaf.keys.length) {
          return; // Doesn't need to merge
        }
      }
    } else if (leaf.size() >= this._minKeys()) {
      return; // Doesn't need to merge
    }

    if (leaf === this.root) {
      // If we are merging the root
      if (leaf.children.length === 1) {
        leaf.children[0].parent = null;
        this.root = leaf.children[0];
        this.root.updateKeys();

        leaf.children = [];
      } else {
        leaf.updateKeys();
        leaf.setParentOnChildren();
      }
    } else {
      // Check Siblings
      const childPos: number = leaf.parent.children.indexOf(leaf);
      let leftSibling = null;
      let rightSibling = null;

      if (childPos > 0) {
        leftSibling = leaf.parent.children[childPos - 1];
      }

      if (childPos < leaf.parent.children.length - 1) {
        rightSibling = leaf.parent.children[childPos + 1];
      }

      if (leaf.children.length > 0) {
        if (leftSibling && leftSibling.size() > this._minKeys()) {
          // Check the left sibling

          leaf.keys.unshift(leftSibling.keys.pop());
          leaf.children.unshift(leftSibling.children.pop());
          leaf.parent.keys[childPos - 1] = leaf.keys[0];
          leaf.updateKeys();
          leaf.setParentOnChildren();
          leftSibling.updateKeys();
          leftSibling.setParentOnChildren();

          leaf.parent.updateKeys();
        } else if (rightSibling && rightSibling.size() > this._minKeys()) {
          // Check the right sibling

          leaf.keys.push(rightSibling.keys.shift());
          leaf.children.push(rightSibling.children.shift());
          leaf.parent.keys[leaf.parent.children.indexOf(rightSibling) - 1] =
            rightSibling.keys[0];
          leaf.updateKeys();
          leaf.setParentOnChildren();
          rightSibling.updateKeys();
          rightSibling.setParentOnChildren();

          leaf.parent.updateKeys();
        } else {
          if (leftSibling) {
            leftSibling.keys = leftSibling.keys.concat(leaf.keys);
            leftSibling.children = leftSibling.children.concat(leaf.children);
            leftSibling.updateKeys();
            leftSibling.setParentOnChildren();
          } else {
            rightSibling.keys = leaf.keys.concat(rightSibling.keys);
            rightSibling.children = leaf.children.concat(rightSibling.children);
            rightSibling.updateKeys();
            rightSibling.setParentOnChildren();
          }
          leaf.keys = [];
          leaf.children = [];

          // Remove leaf from parent
          leaf.parent.children.splice(childPos, 1);

          // Update keys on parent branch
          leaf.parent.updateKeys();
        }
        this._mergeLeaf(leaf.parent);
      } else {
        if (leftSibling && leftSibling.size() > this._minKeys()) {
          // Check the left sibling

          leaf.keys.unshift(leftSibling.keys.pop());
          leaf.values.unshift(leftSibling.values.pop());

          leaf.parent.keys[childPos - 1] = leaf.keys[0];
        } else if (rightSibling && rightSibling.size() > this._minKeys()) {
          // Check the right sibling

          leaf.keys.push(rightSibling.keys.shift());
          leaf.values.push(rightSibling.values.shift());

          leaf.parent.keys[leaf.parent.children.indexOf(rightSibling) - 1] =
            rightSibling.keys[0];
        } else {
          if (leftSibling) {
            leftSibling.keys = leftSibling.keys.concat(leaf.keys);
            leftSibling.values = leftSibling.values.concat(leaf.values);
          } else {
            rightSibling.keys = leaf.keys.concat(rightSibling.keys);
            rightSibling.values = leaf.values.concat(rightSibling.values);
          }

          if (leaf.prev) {
            leaf.prev.next = leaf.next;
          }
          if (leaf.next) {
            leaf.next.prev = leaf.prev;
          }
          leaf.keys = [];
          leaf.values = [];
          leaf.parent.children.splice(childPos, 1);
          leaf.parent.updateKeys();
        }

        this._mergeLeaf(leaf.parent);
      }
    }
  }
}

export { BPlusTree };
export default BPlusTree;
