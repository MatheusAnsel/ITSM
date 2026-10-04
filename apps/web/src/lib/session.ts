// O access token fica só em memória (nunca em localStorage). O refresh token
// vai em cookie httpOnly definido pela API.
let accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};
export const getAccessToken = (): string | null => accessToken;
