import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

class CustomAxiosInstance {
  private instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: import.meta.env.VITE_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  private async getRequestData<T>(request: () => Promise<AxiosResponse<T>>): Promise<T> {
    let response: AxiosResponse<T>;

    try {
      response = await request();
      return response.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  get<T = never>(endPoint: string, config?: AxiosRequestConfig): Promise<T> {
    return this.getRequestData<T>(() => this.instance.get(endPoint, config))
  }

  post<T = never>(endPoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.getRequestData(() => this.instance.post(endPoint, data, config));
  }
}

export const axiosInstance = new CustomAxiosInstance();
