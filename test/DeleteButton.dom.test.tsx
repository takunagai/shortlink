import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DeleteButton } from "../src/components/DeleteButton";

describe("DeleteButton", () => {
  it("opens a confirmation dialog when clicked and calls onDelete on confirm", async () => {
    const onDelete = vi.fn().mockResolvedValue({ ok: true });
    render(<DeleteButton slug="my-link" onDelete={onDelete} />);

    const deleteButton = screen.getByRole("button", { name: "/my-link を削除" });
    await userEvent.click(deleteButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("リンクを削除")).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", { name: "削除" });
    await userEvent.click(confirmButton);

    expect(onDelete).toHaveBeenCalledWith("my-link");
  });

  it("closes the dialog when cancelled", async () => {
    const onDelete = vi.fn();
    render(<DeleteButton slug="my-link" onDelete={onDelete} />);

    await userEvent.click(screen.getByRole("button", { name: "/my-link を削除" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("shows an error message when deletion fails", async () => {
    const onDelete = vi.fn().mockResolvedValue({ ok: false, message: "already deleted" });
    render(<DeleteButton slug="my-link" onDelete={onDelete} />);

    await userEvent.click(screen.getByRole("button", { name: "/my-link を削除" }));
    await userEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("already deleted");
  });
});
