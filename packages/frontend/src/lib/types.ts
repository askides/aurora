export interface IWebsite {
  id: string;
  name: string;
  url: string;
  is_public: boolean;
}

export interface IUser {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  created_at: string;
  updated_at: string;
}
