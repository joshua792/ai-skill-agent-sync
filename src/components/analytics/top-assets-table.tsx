"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TopAssetsTableProps {
  assets: {
    name: string;
    slug: string;
    downloadCount: number;
    forkCount: number;
  }[];
}

export function TopAssetsTable({ assets }: TopAssetsTableProps) {
  if (assets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Assets by Downloads</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No assets yet. Create your first asset to see analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Assets by Downloads</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead className="text-right">Downloads</TableHead>
              <TableHead className="text-right">Forks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((a) => (
              <TableRow key={a.slug}>
                <TableCell>
                  <Link
                    href={`/assets/${a.slug}`}
                    className="hover:underline"
                  >
                    {a.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  {a.downloadCount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {a.forkCount.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
