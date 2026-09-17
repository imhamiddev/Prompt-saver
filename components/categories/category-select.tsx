"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/lib/queries/categories";

export function CategorySelect({
  categories,
  defaultValue,
  name = "categoryId",
}: {
  categories: Category[];
  defaultValue?: string;
  name?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <>
      {/* Radix Select doesn't participate in native form submission, so we
          mirror its value into a hidden input that Server Actions read
          from FormData. */}
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="w-full" aria-label="Category">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent>
          {categories.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No categories yet — create one first.
            </div>
          )}
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
