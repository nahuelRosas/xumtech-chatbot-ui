export interface Quest {
  uid: string;
  question: string;
  answer?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateQuestDto = {
  question: string;
  answer?: string;
  uid?: string;
};

export type UpdateQuestDto = Partial<CreateQuestDto>;

export interface CreateQuestsResponse {
  created: Quest[];
}
