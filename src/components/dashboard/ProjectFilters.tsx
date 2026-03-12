"use client";

import React from "react";
import { Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SortOption = "recent" | "oldest" | "name";
export type FilterOption = "all" | "quick" | "full";

interface ProjectFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  filterBy: FilterOption;
  onFilterChange: (value: FilterOption) => void;
}

export function ProjectFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange,
}: ProjectFiltersProps) {
  return (
    <section className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search projects by name or description..."
          className="h-11 rounded-2xl pl-10 text-sm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="rounded-full">
                Filter
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Project type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={filterBy}
              onValueChange={(value) => onFilterChange(value as FilterOption)}
            >
              <DropdownMenuRadioItem value="all">
                All projects
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="quick">
                Quick Start
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="full">
                Full Architecture
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="rounded-full">
                Sort
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort projects</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={(value) => onSortChange(value as SortOption)}
            >
              <DropdownMenuRadioItem value="recent">
                Recently updated
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="oldest">
                Oldest updated
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="name">
                Name A–Z
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  );
}
