export class CategoryEntity {
  id: string;
  name: string;
  description: string;

  constructor(partial: Partial<CategoryEntity>) {
    Object.assign(this, partial);
  }
}
