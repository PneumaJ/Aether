export interface Plan {
  id: number;
  date: string;
  content: string;
  done: boolean;
  sort_order: number;
  is_daily: boolean;
}

export interface CreatePlanInput {
  date?: string;
  content: string;
  sort_order?: number;
  is_daily?: boolean;
}

export interface UpdatePlanInput {
  id: number;
  content?: string;
  done?: boolean;
  sort_order?: number;
}
