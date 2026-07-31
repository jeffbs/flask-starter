/**
 * Snapshot-Tests der UI-Bausteine (Brief §8) — frieren das gerenderte
 * Markup ein; jede visuelle Änderung wird im Diff sichtbar.
 */
import renderer from 'react-test-renderer';
import { Button, EmptyState, FormField, StatusChip, VerifiedBadge } from '../src/components/ui';
import { OfferCard } from '../src/components/OfferCard';
import { ListingRow } from '../src/components/ListingRow';
import type { ListingRowData, Message } from '../src/types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

function snap(element: React.ReactElement) {
  let tree: renderer.ReactTestRenderer;
  renderer.act(() => {
    tree = renderer.create(element);
  });
  expect(tree!.toJSON()).toMatchSnapshot();
  renderer.act(() => tree!.unmount());
}

describe('Button', () => {
  it.each(['primary', 'secondary', 'danger', 'ghost'] as const)('Variante %s', (variant) => {
    snap(<Button title="Aktion" onPress={() => {}} variant={variant} />);
  });
  it('deaktiviert und ladend', () => {
    snap(<Button title="Senden" onPress={() => {}} disabled />);
    snap(<Button title="Senden" onPress={() => {}} loading />);
  });
});

describe('VerifiedBadge (KYB-Siegel)', () => {
  it('verifiziert → Siegel, unverifiziert → nichts', () => {
    snap(<VerifiedBadge verified />);
    snap(<VerifiedBadge verified={false} />);
  });
});

describe('StatusChip', () => {
  it.each(['ACTIVE', 'PAUSED', 'SOLD', 'REMOVED', 'EXPIRED'])('Inserats-Status %s', (value) => {
    snap(<StatusChip kind="listing" value={value} />);
  });
  it.each(['PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'])('Angebots-Status %s', (value) => {
    snap(<StatusChip kind="offer" value={value} />);
  });
});

describe('FormField', () => {
  it('mit Fehler und mit Hinweis', () => {
    snap(<FormField label="Titel" value="" onChangeText={() => {}} error="Zu kurz" />);
    snap(<FormField label="PLZ" value="44145" onChangeText={() => {}} hint="Pflichtfeld" />);
  });
});

describe('EmptyState', () => {
  it('mit und ohne Aktion', () => {
    snap(
      <EmptyState
        title="Keine Treffer"
        message="Filter lockern?"
        actionTitle="Zurücksetzen"
        onAction={() => {}}
      />,
    );
    snap(<EmptyState title="Noch nichts gemerkt" />);
  });
});

const baseMessage: Message = {
  id: 'm1',
  conversationId: 'c1',
  type: 'OFFER',
  body: null,
  offerAmountCents: 1950000,
  offerStatus: 'PENDING',
  createdAt: '2026-07-01T10:00:00.000Z',
  sender: { id: 'u1', firstName: 'Max', lastName: 'Müller', companyId: 'firma-1' },
};

describe('OfferCard (Preisvorschlag, Brief §6.6)', () => {
  it('offen, fremd → Annehmen/Ablehnen', () => {
    snap(<OfferCard message={baseMessage} isMine={false} onRespond={() => {}} />);
  });
  it('offen, eigener → Zurückziehen', () => {
    snap(<OfferCard message={baseMessage} isMine onRespond={() => {}} />);
  });
  it('angenommen / abgelehnt / zurückgezogen → keine Aktionen', () => {
    for (const offerStatus of ['ACCEPTED', 'DECLINED', 'WITHDRAWN'] as const) {
      snap(<OfferCard message={{ ...baseMessage, offerStatus }} isMine={false} onRespond={() => {}} />);
    }
  });
});

const baseListing: ListingRowData = {
  id: 'l1',
  title: 'Minibagger Kubota KX019-4, Bj. 2019',
  priceCents: 2190000,
  priceType: 'NEGOTIABLE',
  isNetPrice: true,
  condition: 'USED',
  quantity: 1,
  unit: null,
  zip: '44145',
  city: 'Dortmund',
  status: 'ACTIVE',
  createdAt: '2026-07-01T10:00:00.000Z',
  publishedAt: null, // relative Zeit wäre nicht snapshot-stabil
  categoryId: 'cat1',
  images: [{ url: 'https://example.test/foto.jpg' }],
  company: { id: 'firma-1', name: 'Stahlbau Müller GmbH' },
};

describe('ListingRow (Brief §6.2)', () => {
  it('Standardzeile mit Bild und VB-netto-Preis', () => {
    snap(<ListingRow listing={baseListing} />);
  });
  it('ohne Bild, Preis auf Anfrage, Mengenangabe', () => {
    snap(
      <ListingRow
        listing={{
          ...baseListing,
          images: [],
          priceCents: null,
          priceType: 'ON_REQUEST',
          quantity: 200,
          unit: 'Stück',
        }}
      />,
    );
  });
  it('mit Status-Badge (Merkliste/Meins): verkauft ausgegraut', () => {
    snap(<ListingRow listing={{ ...baseListing, status: 'SOLD' }} showStatus />);
  });
});
