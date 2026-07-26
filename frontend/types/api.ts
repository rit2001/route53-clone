export type ApiErrorDetail = {
  code: string;
  message: string;
};

export type ApiErrorPayload = {
  detail?: ApiErrorDetail | unknown;
};
