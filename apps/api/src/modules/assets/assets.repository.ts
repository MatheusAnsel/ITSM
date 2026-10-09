import type { AssetStatusName, AssetTypeName } from './assets.rules';

export interface AssetView {
  id: string;
  tag: string;
  name: string;
  type: AssetTypeName;
  status: AssetStatusName;
  serialNumber: string | null;
  purchaseDate: Date | null;
  notes: string | null;
  assignedToId: string | null;
  assignedTo: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetTicketView {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  createdAt: Date;
}

export interface AssetFilter {
  type?: AssetTypeName;
  status?: AssetStatusName;
  assignedToId?: string;
  search?: string;
  skip: number;
  take: number;
}

export interface AssetCreateData {
  tag: string;
  name: string;
  type: AssetTypeName;
  status: AssetStatusName;
  serialNumber?: string | null;
  purchaseDate?: Date | null;
  notes?: string | null;
  assignedToId: string | null;
}

export type AssetUpdateData = Partial<Omit<AssetCreateData, 'assignedToId'>> & {
  assignedToId?: string | null;
};

export abstract class AssetsRepository {
  abstract list(filter: AssetFilter): Promise<{ items: AssetView[]; total: number }>;
  abstract findById(id: string): Promise<AssetView | null>;
  abstract findByTag(tag: string): Promise<AssetView | null>;
  abstract findUser(id: string): Promise<{ id: string; active: boolean } | null>;
  abstract listTickets(assetId: string): Promise<AssetTicketView[]>;
  abstract create(data: AssetCreateData): Promise<AssetView>;
  abstract update(id: string, data: AssetUpdateData): Promise<AssetView>;
}
