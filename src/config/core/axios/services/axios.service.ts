import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import axios from "axios";
import { ApiResponseError } from "../errors/api-response-error";
import type { IApiResponseError } from "../interface/iapi-response-error";
import type { IHTTPRequestService } from "../interface/iHTTP-request-service";
import { auth } from "../../../firebase";

function createErrorHandler() {
  return async function handleAxiosError(
    error: Error | AxiosError<IApiResponseError>
  ) {
    if (!axios.isAxiosError<IApiResponseError>(error) || !error.response) {
      return Promise.reject(new Error(error.message));
    }
    return Promise.reject(
      new ApiResponseError({
        error: error.response.data.error,
        message: error.response.data.message,
        statusCode: error.response.data.statusCode,
        success: error.response.data.success,
        details: error.response.data.details,
        timestamp: error.response.data.timestamp,
        path: error.response.data.path,
      })
    );
  };
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.DEV
    ? import.meta.env.VITE_BACKEND_URL || "http://localhost:8080/api"
    : import.meta.env.VITE_BACKEND_URL,
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const idToken = await auth.currentUser?.getIdToken();

    if (idToken) {
      config.headers.set("Authorization", `Bearer ${idToken}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  createErrorHandler()
);

function createAxiosService(
  instance: AxiosInstance
): IHTTPRequestService<AxiosRequestConfig> {
  return {
    get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
      const response = await instance.get<T>(url, config);
      return response.data;
    },
    post: async <T, K = unknown>(
      url: string,
      body: K,
      config?: AxiosRequestConfig
    ): Promise<T> => {
      const response = await instance.post<T>(url, body, config);
      return response.data;
    },
    patch: async <T, K = unknown>(
      url: string,
      body: K,
      config?: AxiosRequestConfig
    ): Promise<T> => {
      const response = await instance.patch<T>(url, body, config);
      return response.data;
    },
    put: async <T, K = unknown>(
      url: string,
      body: K,
      config?: AxiosRequestConfig
    ): Promise<T> => {
      const response = await instance.put<T>(url, body, config);
      return response.data;
    },
    delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
      const response = await instance.delete<T>(url, config);
      return response.data;
    },
    setAuthentication: (token: string) => {
      axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
      return token;
    },
    getAuthentication: () => instance.defaults.headers.common.Authorization,
  };
}

const axiosService = createAxiosService(axiosInstance);
export default axiosService;
