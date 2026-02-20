interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = "APIError";
  }
}

async function fetcher<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  // Build URL with query params
  let fullUrl = url;
  if (params) {
    const searchParams = new URLSearchParams(params);
    fullUrl = `${url}?${searchParams.toString()}`;
  }

  const response = await fetch(fullUrl, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new APIError(response.status, data.error || "Request failed", data);
  }

  return data;
}

export const apiClient = {
  get: <T>(url: string, params?: Record<string, string>) =>
    fetcher<T>(url, { method: "GET", params }),

  post: <T>(url: string, body?: any) =>
    fetcher<T>(url, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(url: string, body?: any) =>
    fetcher<T>(url, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(url: string, body?: any) =>
    fetcher<T>(url, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(url: string) =>
    fetcher<T>(url, { method: "DELETE" }),
};

export { APIError };
