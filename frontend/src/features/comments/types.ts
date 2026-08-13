export interface CommentAuthor {
  id: string;
  email: string;
  name: string | null;
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: CommentAuthor;
}
