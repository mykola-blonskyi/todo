import { graphqlFetch } from '@shared/lib/graphql-client';
import { CategoriesList, type Category } from '@features/categories';

export default async function CategoriesPage() {
  const { myCategories: categories } = await graphqlFetch<{
    myCategories: Category[];
  }>(
    `query CategoriesPage {
      myCategories { id name createdAt }
    }`,
  );

  return <CategoriesList categories={categories} />;
}
