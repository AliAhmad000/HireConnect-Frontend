import { environment } from '../../../environments/environment';

export function getApiOrigin(): string {
  if (/^https?:\/\//i.test(environment.apiUrl)) {
    return new URL(environment.apiUrl).origin;
  }

  return window.location.origin;
}

export function getGatewayOrigin(): string {
  return getApiOrigin();
}
