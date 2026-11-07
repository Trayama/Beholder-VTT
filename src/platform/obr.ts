/**
 * Narrow Owlbear SDK adapter.
 *
 * The browser resolves @owlbear-rodeo/sdk through the import map in
 * background.html. Keeping the SDK surface behind this adapter prevents
 * scene modules from depending on the full extension API.
 */

// @ts-ignore -- resolved by Owlbear's browser import map at runtime.
import OBRRuntime, { buildLine as sdkBuildLine, buildWall as sdkBuildWall } from "@owlbear-rodeo/sdk";

export interface Vector2 {
  x: number;
  y: number;
}

export type PlayerRole = "GM" | "PLAYER";
export type SceneLayer = "MAP" | "GRID" | "DRAWING" | "PROP" | "MOUNT" | "CHARACTER" | "FOG" | "CONTROL" | "RULER" | "POPOVER";

export interface SceneItem {
  id: string;
  type: string;
  name: string;
  visible: boolean;
  locked: boolean;
  layer: SceneLayer;
  position: Vector2;
  rotation: number;
  scale: Vector2;
  metadata: Record<string, unknown>;
  lastModifiedUserId?: string;
  createdUserId?: string;
  attachedTo?: string;
  disableHit?: boolean;
  disableAutoZIndex?: boolean;
  disableAttachmentBehavior?: string[];
  startPosition?: Vector2;
  endPosition?: Vector2;
  points?: Vector2[];
  blocking?: boolean;
  doubleSided?: boolean;
  [key: string]: unknown;
}

export interface LineItem extends SceneItem {
  type: "LINE";
  startPosition: Vector2;
  endPosition: Vector2;
}

export interface WallItem extends SceneItem {
  type: "WALL";
  points: Vector2[];
  blocking: boolean;
  doubleSided: boolean;
}

export interface LineBuilder {
  id(value: string): LineBuilder;
  name(value: string): LineBuilder;
  startPosition(value: Vector2): LineBuilder;
  endPosition(value: Vector2): LineBuilder;
  position(value: Vector2): LineBuilder;
  rotation(value: number): LineBuilder;
  scale(value: Vector2): LineBuilder;
  visible(value: boolean): LineBuilder;
  layer(value: SceneLayer): LineBuilder;
  locked(value: boolean): LineBuilder;
  disableHit(value: boolean): LineBuilder;
  metadata(value: Record<string, unknown>): LineBuilder;
  strokeColor(value: string): LineBuilder;
  strokeOpacity(value: number): LineBuilder;
  strokeWidth(value: number): LineBuilder;
  strokeDash(value: number[]): LineBuilder;
  build(): LineItem;
}

export interface WallBuilder {
  name(value: string): WallBuilder;
  points(value: Vector2[]): WallBuilder;
  attachedTo(value: string): WallBuilder;
  position(value: Vector2): WallBuilder;
  rotation(value: number): WallBuilder;
  scale(value: Vector2): WallBuilder;
  visible(value: boolean): WallBuilder;
  layer(value: SceneLayer): WallBuilder;
  blocking(value: boolean): WallBuilder;
  doubleSided(value: boolean): WallBuilder;
  disableAutoZIndex(value: boolean): WallBuilder;
  disableAttachmentBehavior(value: string[]): WallBuilder;
  metadata(value: Record<string, unknown>): WallBuilder;
  build(): WallItem;
}

export interface ToolEvent {
  pointerPosition: Vector2;
  altKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  target?: SceneItem;
  transformer?: boolean;
}

export interface KeyFilter {
  key: string | string[];
  value: unknown;
  operator?: "==" | "!=";
  coordinator?: "&&" | "||";
}

export interface ToolModeFilter {
  activeTools?: string[];
  activeModes?: string[];
  permissions?: string[];
  roles?: PlayerRole[];
  metadata?: KeyFilter[];
  target?: KeyFilter[];
  dragging?: boolean;
}

export interface ToolActionDefinition {
  id: string;
  icons: ToolIcon[];
  disabled?: { roles?: PlayerRole[] };
  onClick?: (context: unknown, elementId: string) => void | Promise<void>;
  shortcut?: string;
}

export interface PopoverDefinition {
  id: string;
  url: string;
  width: number;
  height: number;
  anchorElementId?: string;
  anchorPosition?: { left: number; top: number };
}

export interface ToolIcon {
  icon: string;
  label: string;
  filter?: { roles?: PlayerRole[]; activeTools?: string[]; activeModes?: string[] };
}

export interface ToolDefinition {
  id: string;
  icons: ToolIcon[];
  defaultMode?: string;
  defaultMetadata?: Record<string, unknown>;
  disabled?: { roles?: PlayerRole[] };
}

export interface ToolModeDefinition {
  id: string;
  icons: ToolIcon[];
  disabled?: { roles?: PlayerRole[] };
  cursors?: Array<{ cursor: string }>;
  preventDrag?: ToolModeFilter;
  onToolClick?: (context: unknown, event: ToolEvent) => boolean | void | Promise<boolean | void>;
  onToolDoubleClick?: (context: unknown, event: ToolEvent) => boolean | void | Promise<boolean | void>;
  onToolDown?: (context: unknown, event: ToolEvent) => void | Promise<void>;
  onToolUp?: (context: unknown, event: ToolEvent) => void | Promise<void>;
  onToolMove?: (context: unknown, event: ToolEvent) => void | Promise<void>;
  onToolDragStart?: (context: unknown, event: ToolEvent) => void | Promise<void>;
  onToolDragMove?: (context: unknown, event: ToolEvent) => void | Promise<void>;
  onToolDragEnd?: (context: unknown, event: ToolEvent) => void | Promise<void>;
  onToolDragCancel?: (context: unknown, event: ToolEvent) => void | Promise<void>;
  onDeactivate?: (context: unknown) => void | Promise<void>;
}

export type ItemInteractionUpdate<T extends SceneItem | SceneItem[] = SceneItem> =
  (recipe: (draft: T) => void) => T;
export type ItemInteraction<T extends SceneItem | SceneItem[] = SceneItem> =
  [update: ItemInteractionUpdate<T>, stop: () => void];

export interface OBRApi {
  onReady(callback: () => void): void;
  player: {
    getRole(): Promise<PlayerRole>;
    getId(): Promise<string>;
    getSelection(): Promise<string[] | undefined>;
    select(items: string[], replace?: boolean): Promise<void>;
    deselect(items?: string[]): Promise<void>;
    onChange(callback: (player: unknown) => void): () => void;
  };
  notification: {
    show(message: string, variant?: "DEFAULT" | "ERROR" | "INFO" | "SUCCESS" | "WARNING"): Promise<string>;
  };
  interaction: {
    startItemInteraction<T extends SceneItem | SceneItem[]>(items: T): Promise<ItemInteraction<T>>;
  };
  tool: {
    create(tool: ToolDefinition): Promise<void>;
    activateTool(id: string): Promise<void>;
    createMode(mode: ToolModeDefinition): Promise<void>;
    remove(id: string): Promise<void>;
    removeMode(id: string): Promise<void>;
    createAction(action: ToolActionDefinition): Promise<void>;
    removeAction(id: string): Promise<void>;
    getMetadata(id: string): Promise<Record<string, unknown>>;
    setMetadata(id: string, update: Record<string, unknown>): Promise<void>;
    getActiveTool(): Promise<string>;
    onToolChange(callback: (id: string) => void): () => void;
    activateMode(toolId: string, modeId: string): Promise<void>;
    getActiveToolMode(): Promise<string | undefined>;
    onToolModeChange(callback: (id: string) => void): () => void;
  };
  scene: {
    isReady(): Promise<boolean>;
    onReadyChange(callback: (ready: boolean) => void): () => void;
    grid: {
      snapPosition(position: Vector2, sensitivity?: number, useCorners?: boolean, useCenter?: boolean): Promise<Vector2>;
    };
    items: {
      getItems(filter?: string[] | ((item: SceneItem) => boolean)): Promise<SceneItem[]>;
      addItems(items: SceneItem[]): Promise<void>;
      updateItems(filterOrItems: SceneItem[] | ((item: SceneItem) => boolean), update: (drafts: SceneItem[]) => void): Promise<void>;
      deleteItems(ids: string[]): Promise<void>;
      getItemBounds(ids: string[]): Promise<{ min: Vector2; max: Vector2; width: number; height: number; center: Vector2 }>;
      onChange(callback: (items: SceneItem[]) => void): () => void;
    };
    history: {
      undo(): Promise<void>;
      redo(): Promise<void>;
      canUndo(): Promise<boolean>;
      canRedo(): Promise<boolean>;
    };
    local: {
      getItems(filter?: (item: SceneItem) => boolean): Promise<SceneItem[]>;
      addItems(items: SceneItem[]): Promise<void>;
      updateItems(filterOrItems: SceneItem[] | ((item: SceneItem) => boolean), update: (drafts: SceneItem[]) => void): Promise<void>;
      deleteItems(ids: string[]): Promise<void>;
      onChange(callback: (items: SceneItem[]) => void): () => void;
    };
  };
  popover: {
    open(popover: PopoverDefinition): Promise<void>;
    close(id: string): Promise<void>;
  };
  viewport: {
    getScale(): Promise<number>;
  };
}

export const OBR = OBRRuntime as unknown as OBRApi;
export const buildLine = sdkBuildLine as unknown as () => LineBuilder;
export const buildWall = sdkBuildWall as unknown as () => WallBuilder;
