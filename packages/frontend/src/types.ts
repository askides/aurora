export interface User {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  created_at: string;
  updated_at: string;
}

export interface Website {
  id: string;
  name: string;
  url: string;
  is_public: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  type: string;
  element: string;
  duration: number;
  is_new_visitor: boolean;
  is_new_session: boolean;
  is_a_bounce: boolean;
  website_id: string;
  created_at: string;
  updated_at: string;
}
