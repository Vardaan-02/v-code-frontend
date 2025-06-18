"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import type { FileNode } from "@/types/file-structure";
import { useFileTree } from "@/contexts/file-tree-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useAddS3Object,
  useDeleteS3Object,
  useRenameS3Object,
} from "@/hooks/useS3Object";
import { useLoadFile, useSaveFile, useSyncFile } from "@/hooks/useFileSystem";
import { getLanguageFromPath } from "@/utils/language-getter";

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
}

export function FileTreeNode({ node, level }: FileTreeNodeProps) {
  const {
    selectedNode,
    setSelectedNode,
    expandedNodes,
    toggleExpanded,
    code,
    setCode,
    setLanguage
  } = useFileTree();

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<"file" | "folder">("file");
  const [createName, setCreateName] = useState("");

  const isExpanded = expandedNodes.has(node.path);
  const isSelected = selectedNode?.path === node.path;
  const hasChildren = node.children && node.children.length > 0;

  const { mutateAsync: addS3Object, isPending: addingS3Object } =
    useAddS3Object();
  const { mutateAsync: renameS3Object } = useRenameS3Object();
  const { mutateAsync: deleteS3Object } = useDeleteS3Object();
  const { mutateAsync: saveFile } = useSaveFile();
  const { mutateAsync: loadFile } = useLoadFile();
  const { mutateAsync: syncFile } = useSyncFile();

  const handleToggleExpand = () => {
    if (node.type === "folder") {
      toggleExpanded(node.path);
    }
  };

  const handleSelect = async () => {
    if (selectedNode && selectedNode.type === "file") {
      await saveFile({ path: selectedNode!.path, content: code });
    }
    if (node.type === "file") {
      const content = await loadFile({ path: node.path });
      await syncFile({ path: node.path, content: content });
      setCode(content);
      setLanguage(getLanguageFromPath(node.path));
    }
    setSelectedNode(node);
  };

  const handleRename = async (path: string) => {
    if (renameValue.trim() && renameValue !== node.name) {
      renameS3Object({ path, name: renameValue });
    }
    setIsRenaming(false);
    setRenameValue(node.name);
  };

  const handleDelete = async (path: string, type: "file" | "folder") => {
    if (createType === "folder") {
      deleteS3Object({ path, type });
    } else {
      deleteS3Object({ path, type });
    }
    setShowDeleteDialog(false);
  };

  const handleCreate = async (path: string) => {
    if (createName.trim()) {
      path = path + "/" + createName;
      if (createType === "folder") {
        addS3Object({ path, type: "folder" });
      } else {
        addS3Object({ path, type: "file" });
      }
    }
    setShowCreateDialog(false);
    setCreateName("");
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-2 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer group",
          isSelected && "bg-accent text-accent-foreground",
          "transition-colors duration-150"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Button */}
        {node.type === "folder" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleExpand();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}

        {/* Icon */}
        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          {node.type === "folder" ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500" />
            )
          ) : (
            <File className="h-4 w-4 text-gray-500" />
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => handleRename(node.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRename(node.path);
                } else if (e.key === "Escape") {
                  setIsRenaming(false);
                  setRenameValue(node.name);
                }
              }}
              className="h-6 text-sm"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm truncate block">{node.name}</span>
          )}
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {node.type === "folder" && (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    setCreateType("folder");
                    setShowCreateDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Folder
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setCreateType("file");
                    setShowCreateDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New File
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {node.type === "folder" && isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <FileTreeNode key={child.path} node={child} level={level + 1} />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {node.type}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{node.name}"?
              {node.type === "folder" &&
                " This will delete all contents of the folder."}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(node.path, node.type)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create New {createType === "folder" ? "Folder" : "File"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={`Enter ${createType} name`}
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreate(node.path);
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleCreate(node.path)}
              disabled={addingS3Object}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
