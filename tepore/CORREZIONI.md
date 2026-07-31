# Correzioni applicate — luglio 2026

## Grafica

**Bottone "+"** — riprogettato (`src/components/BottoneAggiungi.tsx`):
- croce piena in stile insegna di farmacia, disegnata con due barre invece
  che presa da un set di icone (le "plus" hanno il tratto troppo sottile)
- ancorato allo **schermo** e non alla card: sta sopra la tab bar, in basso a
  destra, e non copre più le attività del giorno

## Errori corretti

| # | Problema | Effetto | Correzione |
|---|---|---|---|
| 1 | `manutenzione.tsx` e `piante.tsx` esportavano funzioni oltre al componente | Expo Router segnala errore sulla rotta | funzioni spostate in `src/utils/scadenze.ts` |
| 2 | 3 schermate usavano ancora `Ionicons` | icone di due set diversi mescolati | convertite a Phosphor |
| 3 | Loghi Google/Apple/Facebook non mappati | icone assenti nel login | aggiunti alla mappa |
| 4 | Font applicato solo da un aggancio a runtime | rischio di testo col carattere di sistema | `fontFamily` iniettato accanto a **tutti** i 255 `fontWeight` |
| 5 | Ombre nere legacy in 3 schermate | profondità incoerente | portate ai token stratificati blu |
| 6 | `icona: any` in 3 file | tipizzazione debole | `icona: string` |
| 7 | **Moduli premium sempre bloccati** | Veicoli, Animali, Piante e Statistiche rimandavano al paywall e sembravano rotti | sbloccati automaticamente in sviluppo (`__DEV__`); in produzione valgono gli acquisti reali |

## Verifiche superate

- 72 file analizzati con parser Babel (TypeScript + JSX): **nessun errore di sintassi**
- Tutti gli import relativi risolvono
- Tutte le 29 rotte referenziate esistono
- Nessun export nominato nelle rotte
- Tutte le 71 icone mappate esistono in `phosphor-react-native` 3.0.6
- Tutti i 255 `fontWeight` hanno il `fontFamily` corrispondente

## Sicurezza — invariata e attiva

- `firestore.rules`: default-deny, accesso solo ai membri della casa,
  3 livelli di visibilità applicati **lato server**
- Salute: leggibile **solo** dal proprietario, nemmeno dal partner
- Zona Intima: cifratura end-to-end (il server vede solo ciphertext)
- Ingresso/uscita casa via Cloud Functions (nessuna query enumerabile)

## Da fare al momento della pubblicazione

1. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` come variabile su EAS (ora il login
   Google non funziona nelle build perché `.env` non è tracciato da git)
2. SHA-1 della chiave di firma **del Play Store** su Firebase (Google rifirma
   l'app: senza quella, il login funziona in test e si rompe in produzione)
3. Apple: account Developer + capability "Sign in with Apple"
4. Facebook: app su Meta, App ID in `app.json`, review per il permesso email
5. iOS + Google: `iosUrlScheme` in `app.json`
6. RevenueCat: prodotti sugli store, poi togliere lo sblocco `__DEV__` è
   automatico (vale solo in sviluppo)
