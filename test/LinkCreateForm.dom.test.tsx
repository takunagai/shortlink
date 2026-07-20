import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LinkCreateForm } from "../src/components/LinkCreateForm";

describe("LinkCreateForm", () => {
  it("shows an error when URL is empty", async () => {
    const onCreate = vi.fn();
    render(<LinkCreateForm origin="http://localhost:8787" onCreate={onCreate} />);

    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("URL を入力してください");
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("calls onCreate with trimmed url and slug, then clears inputs on success", async () => {
    const onCreate = vi.fn().mockResolvedValue({ ok: true, shortUrl: "http://localhost:8787/abc" });
    render(<LinkCreateForm origin="http://localhost:8787" onCreate={onCreate} />);

    await userEvent.type(screen.getByLabelText(/URL/i), "https://example.com/page");
    await userEvent.type(screen.getByPlaceholderText("my-link"), "my-slug");
    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    expect(onCreate).toHaveBeenCalledWith({ url: "https://example.com/page", slug: "my-slug" });
    expect(await screen.findByRole("status")).toHaveTextContent("作成しました");
    expect(screen.getByLabelText(/URL/i)).toHaveValue("");
  });

  it("shows an error message returned from onCreate", async () => {
    const onCreate = vi.fn().mockResolvedValue({ ok: false, message: "slug already exists" });
    render(<LinkCreateForm origin="http://localhost:8787" onCreate={onCreate} />);

    await userEvent.type(screen.getByLabelText(/URL/i), "https://example.com/page");
    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("slug already exists");
  });

  it("disables inputs and button while submitting", async () => {
    const onCreate = vi.fn(() => new Promise(() => {}));
    render(<LinkCreateForm origin="http://localhost:8787" onCreate={onCreate} />);

    await userEvent.type(screen.getByLabelText(/URL/i), "https://example.com/page");
    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    expect(screen.getByRole("button", { name: "作成中…" })).toBeDisabled();
    expect(screen.getByLabelText(/URL/i)).toBeDisabled();
  });
});
