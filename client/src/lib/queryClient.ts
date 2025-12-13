import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

export const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  const [resource, queryParams] = queryKey;
  const url =
    typeof resource === "string"
      ? resource
      : Array.isArray(queryKey)
        ? queryKey.filter((segment) => typeof segment === "string").join("/")
        : String(resource);

  const requestUrl =
    queryParams && typeof queryParams === "object"
      ? `${url}?${new URLSearchParams(queryParams as Record<string, string>)}`
      : url;

  const res = await fetch(requestUrl);
  await throwIfResNotOk(res);

  const contentType = res.headers.get("content-type") ?? "";
  return contentType.includes("application/json") ? res.json() : res.text();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
