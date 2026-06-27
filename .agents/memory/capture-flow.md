---
name: capture (registrar) flow conventions
description: Navigation invariant after photo capture, the "done today" indicator, and silent shutter.
---

# Capture flow (registrar/*)

Flow: quadras → predios → pavimentos → unidades → servicos → camera. The camera is **always** pushed from `registrar/servicos`.

## Done-button navigation
The camera "done" (check) button uses `router.back()` (NOT `router.dismissAll()`) so the user returns to the service selector for the **same unit** to pick another service.
**Why:** users capture multiple services per unit; dismissing all the way to the block selector forced re-navigating the whole hierarchy.
**How to apply:** if a new entry point into the camera is ever added (not via servicos push), revisit this — `router.back()` assumes servicos is the previous screen.

## "Done today" indicator
Services/units that already have photos **today** show a green check badge (`HierarchyCard` `done` prop). Data comes from `getServicesForDateUnit(unitId, todayDateString())` and `getUnitsForDate(floorId, todayDateString())`.
`todayDateString()` returns local `YYYY-MM-DD`; photos are stored as ISO UTC but SQL filters with `date(p.captured_at,'localtime')`, so "today" is the device's local day. Keep these two in lockstep.
`HierarchyCard` renders the done badge alongside the chevron (both can show for tappable done items).

## Silent capture
Shutter sound is disabled via `takePictureAsync({ shutterSound: false })` (option on `CameraPictureOptions`).
