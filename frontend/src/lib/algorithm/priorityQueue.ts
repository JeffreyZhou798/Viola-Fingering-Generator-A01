// Priority Queue implementation for Dyna-Q

export class PriorityQueue<T> {
  private items: Array<{ priority: number; value: T }> = [];

  push(priority: number, value: T): void {
    this.items.push({ priority, value });
    // Sort in descending order (highest priority first)
    this.items.sort((a, b) => b.priority - a.priority);
  }

  pop(): T | undefined {
    const item = this.items.shift();
    return item?.value;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}
