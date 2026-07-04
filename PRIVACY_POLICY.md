# Privacy Policy for PD Notes

**Last updated: July 4, 2026**

PD Notes ("the app") is a personal Parkinson's Disease tracking app. This
policy explains what information the app handles and how.

## Summary

PD Notes does not collect, transmit, or share any of your data. Everything
you enter stays encrypted on your device. The app has no internet access,
no analytics, no advertising, and no third-party services.

## What information the app stores

The app stores the following information, entered directly by you, only on
your device:

- Medication schedules (name, dosage, start/end dates)
- Daily tracking entries (whether medication was taken, day rating, notes)
- Appointments (date, time, location, notes)
- Healthcare contacts (name, role, phone, email, address)

This data is stored locally using Android's `EncryptedSharedPreferences`
(AES-256-GCM encryption). It is never uploaded to a server, because the app
does not have network access at all.

## Contacts permission

If you choose to add a healthcare contact by importing it from your phone's
address book, the app requests the `READ_CONTACTS` permission. This is used
only to let you pick a contact and copy its name, phone number, email, and
address into the app's own encrypted storage. The app does not otherwise
access, read, or transmit your phone's contacts.

## Data sharing

PD Notes does not share any information with the developer, with
advertisers, with analytics providers, or with any other third party. There
are no ads and no analytics or crash-reporting SDKs in the app.

## Data storage and deletion

All data lives in encrypted local storage on your device. Uninstalling the
app permanently deletes all of its data. Because there is no server or
account system, the developer has no way to access, recover, or delete your
data on your behalf — it exists only on your device.

## Children's privacy

PD Notes is not directed at children and is not intended for use by
children.

## Changes to this policy

If this policy changes, the updated version will be posted at this same
location with a revised "Last updated" date.

## Contact

Questions about this policy can be sent to: weinman.apps@gmail.com
