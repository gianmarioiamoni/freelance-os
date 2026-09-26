// src/application/ai/tools/get-notifications-tool.ts
import type { AiAnalyticsServices } from "@/application/ai/ai-service-ports";
import type { AiReadTool } from "@/application/ai/tool-contract";
import { capRows } from "@/application/ai/grounding/serialize";
import { minimizeNotification } from "@/application/ai/grounding/minimize-dtos";

export function createGetNotificationsTool(services: AiAnalyticsServices): AiReadTool {
  return {
    name: "get_notifications",
    description: "Current-user notifications. Body is omitted.",
    readOnly: true,
    argumentKeys: [],
    async execute(context) {
      const rows = await services.getNotificationsForUser(context);
      return { notifications: capRows(rows).map(minimizeNotification) };
    },
  };
}
