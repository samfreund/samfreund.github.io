# Secure Boot on ThinkPad (locked BIOS) — CachyOS live USB and NVMe install

**Status: WORKING** — live USB boots, and the installed system chains
firmware → shim → GRUB → signed kernel, verified end-to-end on 2026-08-08.

## Device constraints

- Secure Boot **enabled** and cannot be disabled (BIOS setup password unknown).
- Setup Mode **disabled** → firmware key databases (PK/KEK/db) are not
  writable from the OS. Only factory keys are enrolled (Lenovo + Microsoft).
- Therefore the firmware can only ever trust Microsoft/Lenovo-signed binaries
  directly. A custom sbctl key can **never** be enrolled in db.
  Do NOT attempt `sbctl enroll-keys` — db writes fail without Setup Mode.

## Trust model

```
firmware db (factory: Lenovo, Microsoft)          <- locked, untouchable
  └─ shimx64.efi  signed by Microsoft UEFI CA 2011 (in db)
       └─ MOK (Machine Owner Keys, writable via MokManager + physical presence)
            ├─ Canonical Ltd. Master CA        (pre-existing)
            └─ sbctl "Database Key"  <-- OUR KEY, enrolled via mokutil
                 ├─ grubx64.efi
                 └─ vmlinuz-linux-cachyos[-lts]
```

MOK is honored by **shim** (Microsoft-signed, so the firmware accepts it).
This is the only viable chain without BIOS access. The "Microsoft 3rd-party
UEFI CA" option must be enabled in firmware (it was) or shim itself is
rejected.

**Rule that must never be broken:** nothing signed only with the custom key
may sit at a firmware-loadable path. The firmware validates against db only
(never MOK), so every firmware-reachable image must be MS-signed shim.

## Key material

- Live keys on the install: `/var/lib/sbctl/keys/{PK,KEK,db}/`
  (not `/usr/share/secureboot` — that path is a red herring on some distros).
- Backup on the live USB: `/sbfix/keys/` (byte-identical, verified) + `GUID`.
- Enrollment cert (DER, for MokManager): `/sbfix/db-der.cer` (also at USB root).
  MokManager only accepts **DER**, not PEM.
- db cert SHA1 fingerprint: `28:D1:21:9C:2A:B8:C8:3F:9A:AE:EA:8A:83:8C:43:9A:7F:CA:09:F5`
  — matches the MOK-enrolled cert exactly.
- The MOK is stored in the machine's NVRAM and persists across
  reboots/reinstalls.

---

# Part 1 — The live USB

Goal: boot `cachyos-desktop-linux-260628.iso` from USB under the constraints
above.

## Why plain sbctl signing wasn't enough

1. Signing the ESP binaries (`BOOTx64.EFI`, etc.) with `sbctl sign -s` doesn't
   help: the firmware only trusts its `db`, our key can't be enrolled there.
2. Enrolling the db cert as a MOK doesn't help plain GRUB either: MOK is only
   consulted by shim, not by the firmware.

## The working chain

```
firmware (MS db) → shim (Microsoft-signed) → grubx64.efi (signed with our key, trusted via MOK) → signed kernels
```

## Ingredients

- **shim**: Ubuntu's `shim-signed` package provides a Microsoft-signed shim
  plus MokManager:
  ```
  curl -O https://archive.ubuntu.com/ubuntu/pool/main/s/shim-signed/shim-signed_1.59+15.8-0ubuntu2_amd64.deb
  ar x shim-signed_*.deb && tar xf data.tar.xz
  # use usr/lib/shim/shimx64.efi.signed.latest  -- the plain shimx64.efi is UNSIGNED
  # and usr/lib/shim/mmx64.efi (MokManager)
  ```
  Gotcha: `shimx64.efi` in the package has an empty certificate table (PE
  security directory = data directory entry 4). Using it gives "Secure Boot
  Violation" immediately. Debian's package ships shim but no MokManager;
  Fedora's download site is bot-protected.

## Remastering the ISO

The live GRUB on this ISO uses the shim-lock verifier, so the kernels
(`vmlinuz-*`, on the read-only ISO9660 partition) must be signed — that
requires rebuilding the ISO:

1. Extract the ISO:
   ```
   mount -o loop,ro cachyos-desktop-linux-260628.iso /mnt/iso
   cp -a /mnt/iso isoroot
   ```
2. Sign the payloads:
   ```
   sbctl sign -s isoroot/arch/boot/x86_64/vmlinuz-linux-cachyos
   sbctl sign -s isoroot/arch/boot/x86_64/vmlinuz-linux-cachyos-lts
   sbctl sign -s isoroot/shellx64.efi isoroot/boot/memtest86+/memtest.efi
   ```
3. Build a patched ESP image (extracted from the original ISO):
   ```
   dd if=cachyos-desktop-linux-260628.iso of=esp.img bs=512 skip=6109664 count=47104
   mount -o loop,rw esp.img /mnt/esp
   mv /mnt/esp/EFI/BOOT/BOOTx64.EFI /mnt/esp/EFI/BOOT/grubx64.efi   # this file IS GRUB
   sbctl sign -s /mnt/esp/EFI/BOOT/grubx64.efi
   cp shimx64.efi.signed.latest /mnt/esp/EFI/BOOT/BOOTx64.EFI
   cp mmx64.efi /mnt/esp/EFI/BOOT/mmx64.efi
   openssl x509 -in /var/lib/sbctl/keys/db/db.pem -outform DER -out /mnt/esp/db-der.cer
   umount /mnt/esp
   ```
4. Rebuild the hybrid ISO — the volume label and BIOS El Torito flags are read
   back from the original ISO, so this works for any CachyOS ISO version
   (change `ISO`). The original's UEFI entry is discarded and replaced with the
   patched ESP. `isohdpfx.bin` = first 32 sectors of the original ISO:
   ```
   ISO=cachyos-desktop-linux-YOUR_VERSION_HERE.iso
   LABEL="$(xorriso -indev "$ISO" -pvd_info 2>/dev/null | \
     sed -n "s/^Volume Id[[:space:]]*:[[:space:]]*//p")"
   dd if="$ISO" of=isohdpfx.bin bs=512 count=32
   mapfile -t ELTORITO < <(xorriso -indev "$ISO" -report_el_torito as_mkisofs 2>/dev/null | \
     awk '
       /^--modification-date=/ { next }
       $1 == "-V" { next }
       $1 == "-eltorito-alt-boot" { exit }
       { for (i = 1; i <= NF; i++) { gsub(/'"'"'/, "", $i); print $i } }')
   xorriso -as mkisofs -r -V "$LABEL" \
     -isohybrid-mbr isohdpfx.bin \
     -partition_cyl_align off -partition_offset 16 --mbr-force-bootable \
     -append_partition 2 0xef esp.img \
     -iso_mbr_part_type 0x00 \
     -isohybrid-gpt-basdat \
     "${ELTORITO[@]}" \
     -eltorito-alt-boot -e --interval:appended_partition_2:all:: -no-emul-boot \
     -output "${ISO%.iso}-signed.iso" isoroot
   ```
   Notes on the derivation:
   - `-pvd_info` prints `Volume Id : <label>` (unquoted); that becomes `-V`.
   - The report's `--modification-date`, `-V`, and UEFI entry
     (`-eltorito-alt-boot` onward) are dropped.
   - Each remaining line is split into separate tokens — `-c` and
     `/boot/syslinux/boot.cat` must be two argv elements, or the mkisofs
     emulation rejects the command.
   - Resulting `ELTORITO` = `-c /boot/syslinux/boot.cat -b
     /boot/syslinux/isolinux.bin -no-emul-boot -boot-load-size 4
     -boot-info-table`, byte-identical in effect to the original's BIOS entry.
5. Flash and verify **byte-for-byte** (mount-based checks misled us once due
   to a stale stacked mount; compare hashes of raw regions instead):
   ```
   dd if="${ISO%.iso}-signed.iso" of=/dev/sdX bs=4M conv=fsync
   dd if=/dev/sdX bs=512 skip=<part2 start> count=47104 | sha256sum   # must equal sha256 of esp.img
   ```

## On the target machine

1. Boot the USB → shim runs, can't verify GRUB yet → **MokManager** appears.
2. *Enroll key from disk* → select `db-der.cer` → confirm → reboot.
   (Alternatively *Enroll hash from disk* on `grubx64.efi`; make sure to pick
   the USB's filesystem — easy to grab the wrong one when multiple sticks are
   attached.)
3. Chain boots: shim → signed GRUB → signed kernels → live environment.

## Live USB notes

- `sbctl sign` takes one file per invocation.
- Final working image kept as `cachyos-signed3.iso`; flashing it alone
  produces a working stick, no post-flash patching needed.
- `sbctl sign` on an already-signed file errors out — harmless.

---

# Part 2 — The NVMe install

## System layout

- `nvme0n1p1` — ESP (FAT32), mounted at `/boot/efi`
- `nvme0n1p2` — LUKS2 (**argon2id**) → `cryptroot` → btrfs
  (subvols `@`, `@home`, `@log`, `@cache`, `@tmp`, `@root`, `@srv`)
- GRUB unlocks LUKS itself (`GRUB_ENABLE_CRYPTODISK=y`; GRUB 2.14's
  `argon2.mod` handles argon2id), then the initramfs re-opens it with the
  embedded keyfile (`rd.luks.key=/crypto_keyfile.bin`).

## Final ESP layout

```
\EFI\cachyos\shimx64.efi   MS-signed shim (from live USB, hash-verified)
\EFI\cachyos\mmx64.efi     MokManager (Canonical-signed, Canonical CA is in MOK)
\EFI\cachyos\grubx64.efi   our GRUB, sbctl-signed   <- boot entry target chain
\EFI\BOOT\BOOTX64.EFI      SAME shim (fallback path, used by "NVMe0"/auto-boot)
\EFI\BOOT\mmx64.efi        MokManager
\EFI\BOOT\grubx64.efi      SAME signed GRUB (hash-identical to cachyos copy)
\EFI\systemd\systemd-bootx64.efi   legacy, signed but NOT firmware-bootable
                                   (key not in db) — inert, kept only as files
```

EFI boot entries: `Boot0004 "cachyos" → \EFI\cachyos\shimx64.efi`, first in
BootOrder. The old systemd-boot entry (Boot0006) and the stale direct-grub
entry were deleted.

## Full procedure (distilled, in the order that works)

Run from the CachyOS live USB as root.

1. Mount the install and chroot (see `/mnt2/mount.sh`): luksOpen, mount
   btrfs subvols, mount ESP at `/mnt/boot/efi`, bind proc/sys/dev/run,
   `arch-chroot /mnt`.
2. Place keys: `cp -r /mnt2/sbfix/keys /mnt2/sbfix/GUID /var/lib/sbctl/`
   (inside chroot, adjust source path).
3. Enroll the key in MOK (one time, requires one reboot):
   `mokutil --import /mnt2/db-der.cer` → reboot → MokManager →
   "Enroll MOK" → confirm. Verify later with `mokutil --list-enrolled`.
4. Install the shim chain on the ESP (both locations above):
   shim/mmx64 live in `/mnt2/sbfix/` and in the USB ESP image
   (`\EFI\BOOT\` of the ARCHISO_EFI partition; extract with mtools if the
   partition is mounted elsewhere, see Troubleshooting).
5. Build GRUB correctly (BOTH flags are mandatory — see Incident 2 & 3):

   ```
   grub-install --target=x86_64-efi --efi-directory=/boot/efi \
     --bootloader-id=cachyos --no-nvram --recheck \
     --sbat=/usr/share/grub/sbat.csv \
     --modules="all_video bli btrfs cryptodisk efi_gop efi_uga \
gcry_rijndael gcry_sha256 gcry_sha512 gettext gfxmenu gfxterm gzio jpeg \
luks luks2 part_gpt part_msdos png tga video_bochs video_cirrus argon2 \
pbkdf2 normal configfile linux chain echo test search search_fs_uuid \
search_label probe ls terminal terminfo boot reboot halt keystatus sleep \
true loadenv memdisk tar cpuid font video"
   ```

   (`vbe`, `vga`, `ieee1275_fb`, `saveenv` don't exist for x86_64-efi;
   grub-mkimage aborts if listed. Dependencies resolve automatically.)
6. Sign everything with the sbctl db key:

   ```
   sbctl sign -s /boot/efi/EFI/cachyos/grubx64.efi   # -s records it in files.json
   sbctl sign -s /boot/vmlinuz-linux-cachyos
   sbctl sign -s /boot/vmlinuz-linux-cachyos-lts
   cp /boot/efi/EFI/cachyos/grubx64.efi /boot/efi/EFI/BOOT/grubx64.efi
   ```

   Ensure `/var/lib/sbctl/files.json` tracks: both grubx64.efi copies, both
   kernels, systemd-boot files. NOT shim/mmx64 (they keep vendor sigs).
   The sbctl pacman hook re-signs everything in files.json automatically.
7. Boot entries:

   ```
   efibootmgr -b 0004 -B          # remove stale direct-grub entry if present
   efibootmgr -b 0006 -B          # remove systemd-boot entry if present
   efibootmgr --create --disk /dev/nvme0n1 --part 1 \
     --label "cachyos" --loader '\EFI\cachyos\shimx64.efi'
   ```

   Confirm the new entry is first in BootOrder.
8. Verify: `sbctl verify`, `sbverify --cert /var/lib/sbctl/keys/db/db.pem <file>`
   for grub + kernels, `objdump -h <grub> | grep sbat`, then reboot.

---

# Incidents & root causes (chronological)

## Incident 1 — firmware "Secure Boot Violation" on first reboot

Symptom: red Lenovo violation screen before any bootloader.
Cause: boot paths that bypassed shim still existed — the systemd-boot boot
entry (Boot0006) and the fallback `\EFI\BOOT\BOOTX64.EFI` (a custom-signed
systemd-boot). Firmware validates against db only; our key is MOK-only.
Fix: deleted the systemd-boot entry; replaced the fallback loader with the
MS-signed shim (+ signed grubx64.efi and mmx64.efi alongside).
Lesson: see the bold rule above.

## Incident 2 — shim loads, then `Verification failed: (0x1A) Security Violation`

Symptom: shim's own error screen (offers MokManager), then firmware
violation screen. GRUB never started.
Diagnosis: `sbverify --cert db.pem` on grub was OK and the key was in MOK,
but comparing against the live USB's *working* grub (same version, same
key) showed ours lacked an **`.sbat` section** — plain `grub-install` does
not embed SBAT metadata, and shim 16.x rejects second-stage images without
it.
Fix: rebuilt with `--sbat=/usr/share/grub/sbat.csv`, re-signed.
Check: `objdump -h grubx64.efi | grep sbat`.

## Incident 3 — `error: kern/efi/sb.c:shim_lock_verifier_init:177: prohibited by secure boot policy`

Symptom: after LUKS unlock ("slot 0 opened"), this grub error; boot aborts.
This looks like a signature error but **is not one**.
Diagnosis: in grub 2.14 source (`grub-core/kern/efi/sb.c`), that line is
the *default case* of the shim_lock verifier's file-type whitelist. Under
SB, GRUB refuses to read any file type it cannot verify — and that
includes **loading `.mod` module files from disk**. The auto-generated
image (552 KB) embeds only the modules needed to find `/boot`; as soon as
`grub.cfg` ran `insmod all_video` (theme/gfx), the read was blocked.
The live ISO's grub is monolithic (7.7 MB, everything embedded), which is
why it never hits this.
Fix: rebuilt with the full `--modules` list (see procedure), re-signed,
deployed to both locations. Image grew to ~1.3 MB.

Red herrings chased and eliminated during Incident 3 (all verified NOT to
be the cause — useful checklist if it ever recurs):

- Kernel signature invalid? No — `sbverify --cert` OK (`--cert` is strict;
  verified by cross-checking with the wrong cert).
- Signer cert mismatch (two certs with same CN)? No — extracted the PKCS7
  signer certs from both kernels; DER fingerprint identical to db.pem.
- Kernel hash in dbx? No — computed the Authenticode SHA256 (python, PE
  aware) and compared against all 466 dbx hashes.
- MOK blacklist (MokListX)? Only the all-zero placeholder.
  (`/sys/firmware/efi/efivars/MokListXRT-*`)
- SBAT revocation of kernel? SbatLevelRT = `sbat,1,2024040900` revoking
  shim<4, grub<4, grub.peimage<2 — no `linux` entries; and the equally
  SBAT-less ISO kernel boots fine.
- Unsigned snapshot kernels (grub-btrfs)? Real issue but not this boot:
  snapshots 1–19 predate signing and their kernels are UNSIGNED; they can
  never pass SB (snapshots are read-only — cannot be signed retroactively).
  Snapshots 20+ captured signed kernels and boot fine.

---

# Troubleshooting cheatsheet

```
sbctl status | verify | list-enrolled-keys
mokutil --sb-state | --list-enrolled | --list-new
sbverify --list <file>                        # who signed it
sbverify --cert keys/db/db.pem <file>         # strict crypto check
openssl x509 -in db.pem -noout -fingerprint -sha1
objdump -h <file> | grep -i sbat              # SBAT presence
objcopy -O binary --only-section=.sbat <file> - | tr ',' '\n'
efibootmgr -v                                 # entries + BootOrder
ls /sys/firmware/efi/efivars | grep -iE 'mok|sbat'   # RT mirrors of MOK state
strings <grub.efi> | grep -c shim_lock        # verifier present
```

Accessing the USB ESP image while the host has it mounted (from inside a
chroot): use mtools directly on the block device instead of mounting:

```
mdir  -i /dev/sda2 ::/EFI/BOOT
mcopy -i /dev/sda2 ::/EFI/BOOT/BOOTX64.EFI shimx64.efi
mcopy -o -i /dev/sda2 localfile ::/sbfix/remotefile
```

(If the host later can't see files written this way, `sync` or remount.)

For filled up NVRAM, identifiable with the below error:
```
cannot create sbatlevelrt: volume full
could not create MokListTrustedRT: Volume Full
something has gone seriously wrong import_mok_state(): Volume Full
```

flash a windows image to a USB (this can boot since it doesn't need to load a shim into NVRAM). Then, build an EXE with [this script](https://gist.github.com/samfreund/6398280deb8c8950f5210b41c1489a33), and run it on the device. If the script doesn't clear enough space, adjust the files it's clearing. You'll have to re-enroll the MOK key after this, I recommmend an ubuntu live usb. 

# Maintenance notes

- Kernel updates: the sbctl pacman hook re-signs all files.json entries
  (kernels, grub copies, systemd-boot). Nothing to do.
- GRUB reinstall: ALWAYS use the full command in the procedure (`--sbat`
  AND `--modules`), then `sbctl sign -s` both grub copies and re-copy to
  `\EFI\BOOT\`.
- Never overwrite `\EFI\BOOT\BOOTX64.EFI` or `\EFI\cachyos\shimx64.efi`
  with custom-signed binaries; never create boot entries pointing directly
  at custom-signed images.
- Snapshot entries 1–19 in the GRUB snapshot submenu have unsigned kernels
  and cannot boot under SB. Use snapshots 20+ only.
- If MOK is wiped (firmware reset/CMOS): re-enroll from the USB with
  `mokutil --import db-der.cer`, reboot, confirm in MokManager.
- If shim gets dbx-revoked by a future firmware/Windows update: replace
  both shim copies with a current signed shim (e.g. from a fresh CachyOS
  live ISO) and re-check.

# USB /sbfix inventory

- `keys/` — PK/KEK/db keypairs (guard these; anyone with db.key can sign
  bootloaders your machine will run)
- `GUID` — sbctl owner GUID
- `db-der.cer` — MOK enrollment cert (DER)
- `shimx64.efi`, `mmx64.efi` — the exact MS/Canonical-signed binaries
  deployed on the ESP
- `fix.sh` — original generic attempt (superseded by this document)
