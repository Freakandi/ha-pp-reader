/**
 * Ambient Home Assistant type declarations for the PP Reader dashboard.
 * These interfaces cover the subset of the frontend runtime that is
 * consumed by the portfolio panel while keeping unknown fields flexible.
 */

export type HassServiceTarget = Record<string, unknown>;

export interface HassContext {
  id: string;
  user_id?: string | null;
  parent_id?: string | null;
}

export interface HassEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  context?: HassContext;
  [key: string]: unknown;
}

export interface HassLocale {
  language: string;
  number_format?: string;
  time_format?: '12' | '24';
  temperature_unit?: string;
  country?: string;
  [key: string]: unknown;
}

export interface HassPanelCustomConfig {
  module_url?: string;
  embed_iframe?: boolean;
  trust_external?: boolean;
  require_admin?: boolean;
  config?: {
    entry_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface HassPanelOptions {
  entry_id?: string;
  _panel_custom?: HassPanelCustomConfig;
  [key: string]: unknown;
}

export interface HassPanel {
  component_name?: string;
  url_path?: string;
  title?: string;
  icon?: string;
  panel_icon?: string;
  webcomponent_name?: string;
  config?: HassPanelOptions;
  require_admin?: boolean;
  js_url?: string;
  [key: string]: unknown;
}

export type HassPanels = Record<string, HassPanel>;

export interface HassPanelInfo extends HassPanel {
  url_path: string;
}

export interface HassRoute {
  path: string;
  prefix?: string;
  [key: string]: unknown;
}

export interface HassUser {
  id: string;
  name: string;
  is_owner?: boolean;
  is_admin?: boolean;
  [key: string]: unknown;
}

export type HassEventOrigin = 'LOCAL' | 'REMOTE' | 'CLOUD';

export interface HassEvent<T = unknown> {
  origin: HassEventOrigin;
  time_fired: string;
  event_type: string;
  context?: HassContext;
  data: T;
}

export interface HassWebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export type HassUnsubscribe = () => void;

export interface HassWebSocketConnection {
  sendMessage(message: HassWebSocketMessage): void;
  sendMessagePromise<Response = unknown>(message: HassWebSocketMessage): Promise<Response>;
  subscribeMessage(
    callback: (response: unknown) => void,
    message: HassWebSocketMessage
  ): Promise<HassUnsubscribe>;
  subscribeEvents<EventData = unknown>(
    callback: (event: HassEvent<EventData>) => void,
    eventType?: string
  ): Promise<HassUnsubscribe>;
  [key: string]: unknown;
}

export interface HomeAssistant {
  connection: HassWebSocketConnection;
  panels?: HassPanels;
  panelUrl?: string;
  callService?: (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: HassServiceTarget
  ) => Promise<void> | void;
  callApi?: <Response = unknown>(
    method: string,
    path: string,
    parameters?: unknown
  ) => Promise<Response>;
  callWS?: <Response = unknown>(message: HassWebSocketMessage) => Promise<Response>;
  states?: Record<string, HassEntityState>;
  locale?: HassLocale;
  language?: string;
  user?: HassUser;
  formatEntityState?: (state: HassEntityState) => string;
  formatDateTime?: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber?: (value: number, options?: Intl.NumberFormatOptions) => string;
  [key: string]: unknown;
}

export interface HassPanelElement extends HTMLElement {
  hass?: HomeAssistant;
  panel?: HassPanel;
  route?: HassRoute;
  narrow?: boolean;
  [key: string]: unknown;
}
