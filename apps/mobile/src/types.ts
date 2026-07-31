export type CompanyStatus = 'UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
export type PriceType = 'FIXED' | 'NEGOTIABLE' | 'ON_REQUEST';
export type Condition = 'NEW' | 'LIKE_NEW' | 'USED' | 'DEFECT';
export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'SOLD' | 'EXPIRED' | 'REMOVED';
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
export type MessageType = 'TEXT' | 'OFFER' | 'SYSTEM';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string | null;
}

export interface Company {
  id: string;
  name: string;
  legalForm: string | null;
  vatId: string | null;
  registrationNumber: string | null;
  registrationCourt: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  website: string | null;
  description: string | null;
  status: CompanyStatus;
  rejectionReason: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
}

export interface ListingRowData {
  id: string;
  title: string;
  priceCents: number | null;
  priceType: PriceType;
  isNetPrice: boolean;
  condition: Condition | null;
  quantity: number;
  unit: string | null;
  zip: string;
  city: string;
  status: ListingStatus;
  createdAt: string;
  publishedAt: string | null;
  categoryId: string;
  images: Array<{ url: string }>;
  company: { id: string; name: string };
}

export interface ListingDetail extends Omit<ListingRowData, 'company' | 'images'> {
  description: string;
  contactPhone: string | null;
  viewCount: number;
  images: Array<{ id: string; url: string; sortOrder: number }>;
  category: { id: string; name: string; slug: string };
  company: {
    id: string;
    name: string;
    city: string | null;
    status: CompanyStatus;
    verifiedAt: string | null;
    createdAt: string;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  type: MessageType;
  body: string | null;
  offerAmountCents: number | null;
  offerStatus: OfferStatus | null;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string; companyId: string | null };
}

export interface ConversationListItem {
  id: string;
  listing: {
    id: string;
    title: string;
    priceCents: number | null;
    priceType: PriceType;
    status: ListingStatus;
    images: Array<{ url: string }>;
  };
  counterpart: { id: string; name: string };
  role: 'BUYER' | 'SELLER';
  lastMessage: Omit<Message, 'sender'> | null;
  unreadCount: number;
  updatedAt: string;
}

export interface FavoriteItem {
  id: string;
  listing: {
    id: string;
    title: string;
    priceCents: number | null;
    priceType: PriceType;
    isNetPrice: boolean;
    city: string;
    zip: string;
    status: ListingStatus;
    images: Array<{ url: string }>;
    company: { id: string; name: string };
  };
}

export interface KybStatus {
  status: CompanyStatus;
  rejectionReason: string | null;
  vatId: string | null;
  registrationNumber: string | null;
  documents: Array<{ id: string; type: string; fileName: string; createdAt: string }>;
}
