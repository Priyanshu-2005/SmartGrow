import { Download, Play, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ModelInfo } from "../utils/models";
import { formatSize } from "../utils/models";

export interface ModelStatus {
  downloaded: boolean;
  downloading: boolean;
  progress: number;
  progressText: string;
  error: string;
  loaded: boolean;
}

interface ModelCardProps {
  model: ModelInfo;
  status: ModelStatus;
  onDownload: () => void;
  onDelete: () => void;
  onLoad: () => void;
}

export function ModelCard({
  model,
  status,
  onDownload,
  onDelete,
  onLoad,
}: ModelCardProps) {
  return (
    <div>test component</div>
  );
}
