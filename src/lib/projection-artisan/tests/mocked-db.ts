export class MockDB<T extends { id: string } = { id: string }> {
  public indexedMap = new Map<string, T>();

  constructor(protected indexedBy: keyof T = 'id') {
  }

  async get(): Promise<T[]> {
    return Array.from(this.indexedMap.values())
  }

  async getOne(index: string): Promise<T> {
    return this.indexedMap.get(index)
  }

  async saveAll(values: T[]) {
    values.forEach(item => this.save(item))
  }

  async save(newValue: T) {
    this.indexedMap.set(String(newValue[this.indexedBy]), newValue)
  }
}
