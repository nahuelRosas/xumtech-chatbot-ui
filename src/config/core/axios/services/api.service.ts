"use client";

import type { AxiosRequestConfig } from "axios";

import type { IApiService } from "../interface/iapi-service";
import type { IHTTPRequestService } from "../interface/iHTTP-request-service";
import axiosService from "./axios.service";

class ApiService<C = unknown> implements IApiService<C> {
  httpService: IHTTPRequestService<C>;

  constructor(httpService: IHTTPRequestService<C>) {
    this.httpService = httpService;
  }

  private buildUrl(url: string, baseUrl?: string): string {
    return baseUrl ? `${baseUrl}/${url}` : url;
  }

  get<T>(url: string, config?: C, baseUrl?: string): Promise<T> {
    return this.httpService.get<T>(this.buildUrl(url, baseUrl), config);
  }

  post<T = unknown, K = unknown>(
    url: string,
    body: K,
    config?: C,
    baseUrl?: string,
  ): Promise<T> {
    return this.httpService.post<T>(this.buildUrl(url, baseUrl), body, config);
  }

  patch<T = unknown, K = unknown>(
    url: string,
    body: K,
    config?: C,
    baseUrl?: string,
  ): Promise<T> {
    return this.httpService.patch<T>(this.buildUrl(url, baseUrl), body, config);
  }

  put<T = unknown, K = unknown>(
    url: string,
    body: K,
    config?: C,
    baseUrl?: string,
  ): Promise<T> {
    return this.httpService.put<T>(this.buildUrl(url, baseUrl), body, config);
  }

  delete<T = unknown>(url: string, config?: C, baseUrl?: string): Promise<T> {
    return this.httpService.delete<T>(this.buildUrl(url, baseUrl), config);
  }

  setAuthentication(token: string) {
    return this.httpService.setAuthentication(token);
  }

  getAuthentication() {
    return this.httpService.getAuthentication();
  }
}

const apiService = new ApiService<AxiosRequestConfig>(axiosService);
export default apiService;
