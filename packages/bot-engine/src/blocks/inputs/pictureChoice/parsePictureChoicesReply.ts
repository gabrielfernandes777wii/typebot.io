import type { PictureChoiceBlock } from "@typebot.io/blocks-inputs/pictureChoice/schema";
import type { SessionState } from "@typebot.io/chat-session/schemas";
import { isNotEmpty } from "@typebot.io/lib/utils";
import type { SessionStore } from "@typebot.io/runtime-session-store";
import type { ParsedReply } from "../../../types";
import { injectVariableValuesInPictureChoiceBlock } from "./injectVariableValuesInPictureChoiceBlock";

export const parsePictureChoicesReply = (
  inputValue: string,
  {
    block,
    state,
    sessionStore,
  }: {
    block: PictureChoiceBlock;
    state: SessionState;
    sessionStore: SessionStore;
  },
): ParsedReply => {
  const displayedItems = injectVariableValuesInPictureChoiceBlock(block, {
    variables: state.typebotsQueue[0].typebot.variables,
    sessionStore,
  }).items;
  if (block.options?.isMultipleChoice) {
    const longestItemsFirst = [...displayedItems].sort(
      (a, b) => (b.title?.length ?? 0) - (a.title?.length ?? 0),
    );
    const matchedItemsByContent = longestItemsFirst.reduce<{
      strippedInput: string;
      matchedItemIds: string[];
    }>(
      (acc, item) => {
        if (
          item.title &&
          acc.strippedInput.toLowerCase().includes(item.title.toLowerCase())
        )
          return {
            strippedInput: acc.strippedInput.replace(item.title ?? "", ""),
            matchedItemIds: [...acc.matchedItemIds, item.id],
          };
        return acc;
      },
      {
        strippedInput: inputValue.trim(),
        matchedItemIds: [],
      },
    );
    const remainingItems = displayedItems.filter(
      (item) => !matchedItemsByContent.matchedItemIds.includes(item.id),
    );
    const matchedItemsByIndex = remainingItems.reduce<{
      strippedInput: string;
      matchedItemIds: string[];
    }>(
      (acc, item, idx) => {
        if (acc.strippedInput.includes(`${idx + 1}`))
          return {
            strippedInput: acc.strippedInput.replace(`${idx + 1}`, ""),
            matchedItemIds: [...acc.matchedItemIds, item.id],
          };
        return acc;
      },
      {
        strippedInput: matchedItemsByContent.strippedInput,
        matchedItemIds: [],
      },
    );

    const matchedItems = displayedItems.filter((item) =>
      [
        ...matchedItemsByContent.matchedItemIds,
        ...matchedItemsByIndex.matchedItemIds,
      ].includes(item.id),
    );

    if (matchedItems.length === 0) return { status: "fail" };
    return {
      status: "success",
      content: matchedItems
        .map((item) =>
          isNotEmpty(item.title) ? item.title : (item.pictureSrc ?? ""),
        )
        .join(", "),
    };
  }
  const longestItemsFirst = [...displayedItems].sort(
    (a, b) => (b.title?.length ?? 0) - (a.title?.length ?? 0),
  );
  const matchedItem = longestItemsFirst.find(
    (item) =>
      item.id === inputValue ||
      item.title?.toLowerCase().trim() === inputValue.toLowerCase().trim() ||
      item.pictureSrc?.toLowerCase().trim() === inputValue.toLowerCase().trim(),
  );
  if (!matchedItem) return { status: "fail" };
  return {
    status: "success",
    outgoingEdgeId: matchedItem.outgoingEdgeId,
    content: isNotEmpty(matchedItem.title)
      ? matchedItem.title
      : (matchedItem.pictureSrc ?? ""),
  };
};
