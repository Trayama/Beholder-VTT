import { OBR } from "./platform/obr.js";
import { isWallSource, readWallSourceMetadata, WALL_SOURCE_KEY } from "./scene/walls/model.js";
import { defaultBlocking } from "./scene/walls/model.js";
import type { BarrierKind, WallSourceMetadata } from "./scene/walls/model.js";

const TOOL_ID = "com.beholder-vtt/wall-editor";
const POPOVER_ID = "com.beholder-vtt/wall-properties";
const status = document.querySelector<HTMLElement>("#status");
const movement = document.querySelector<HTMLInputElement>("#blocks-movement");
const vision = document.querySelector<HTMLInputElement>("#blocks-vision");
const light = document.querySelector<HTMLInputElement>("#blocks-light");
const doorState = document.querySelector<HTMLElement>("#door-state");
const toggleDoor = document.querySelector<HTMLButtonElement>("#toggle-door");
const save = document.querySelector<HTMLButtonElement>("#save");
const cancel = document.querySelector<HTMLButtonElement>("#cancel");

function message(value: string): void {
  if (status) status.textContent = value;
}

let selectedKind: BarrierKind = "wall";
let doorOpen = false;

toggleDoor?.addEventListener("click", () => {
  doorOpen = !doorOpen;
  toggleDoor.textContent = doorOpen ? "��" : "�ر�";
});

OBR.onReady(async () => {
  cancel?.addEventListener("click", () => void OBR.popover.close(POPOVER_ID));
  try {
    const toolMetadata = await OBR.tool.getMetadata(TOOL_ID);
    const wallId = typeof toolMetadata.selectedWallId === "string" ? toolMetadata.selectedWallId : "";
    if (!wallId) {
      message("�����ڵ�ͼ��ѡ��һ��ǽ�塣");
      if (save) save.disabled = true;
      return;
    }
    const sources = await OBR.scene.items.getItems(isWallSource);
    const group = sources.filter((item) => readWallSourceMetadata(item)?.wallId === wallId);
    const doorSegments = group.filter((item) => readWallSourceMetadata(item)?.kind === "door");
    const metadata = doorSegments[0]
      ? readWallSourceMetadata(doorSegments[0])
      : group[0] ? readWallSourceMetadata(group[0]) : null;
    if (!metadata || group.length === 0) {
      message("ѡ�е�ǽ���Ѳ����ڣ�������ѡ��");
      if (save) save.disabled = true;
      return;
    }
    if (movement) movement.checked = metadata.blocking.blocksMovement;
    if (vision) vision.checked = metadata.blocking.blocksVision;
    if (light) light.checked = metadata.blocking.blocksLight;
    selectedKind = doorSegments.length > 0 ? "door" : metadata.kind === "window" ? "window" : "wall";
    const targets = selectedKind === "door" ? doorSegments : group;
    doorOpen = selectedKind === "door" && metadata.open === true;
    if (doorState) doorState.hidden = selectedKind !== "door";
    for (const input of [movement, vision, light]) {
      const row = input?.closest<HTMLElement>(".row");
      if (row) row.hidden = selectedKind === "door";
    }
    if (toggleDoor) toggleDoor.textContent = doorOpen ? "��" : "�ر�";
    message("��ѡ�� " + group.length + " ��ǽ�塣�޸ĺ�ͳһӦ�õ�����ǽ�塣");

    save?.addEventListener("click", async () => {
      save.disabled = true;
      try {
        const blocking = selectedKind === "door" ? defaultBlocking("door", doorOpen) : {
          blocksMovement: movement?.checked ?? true,
          blocksVision: vision?.checked ?? true,
          blocksLight: light?.checked ?? true,
        };
        const ids = new Set(targets.map((item) => item.id));
        await OBR.scene.items.updateItems(
          (item) => ids.has(item.id),
          (drafts) => {
            for (const draft of drafts) {
              const raw = draft.metadata[WALL_SOURCE_KEY] as WallSourceMetadata | undefined;
              if (!raw) continue;
              draft.metadata[WALL_SOURCE_KEY] = {
                ...raw,
                revision: raw.revision + 1,
                blocking,
                ...(selectedKind === "door" ? { open: doorOpen } : {}),
              };
            }
          },
        );
        message("�����ѱ��档");
        await OBR.popover.close(POPOVER_ID);
      } catch (error) {
        message("����ʧ�ܣ�" + (error instanceof Error ? error.message : "δ֪����"));
        save.disabled = false;
      }
    });
  } catch (error) {
    message("�޷���ȡǽ�����ԣ�" + (error instanceof Error ? error.message : "δ֪����"));
    if (save) save.disabled = true;
  }
});
