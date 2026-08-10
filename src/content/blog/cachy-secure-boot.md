---
title: "Installing CachyOS on a device with secure boot enabled"
date: "2026-08-08"
description: "If you don't know the BIOS password to a device, and it has secure boot enabled, you can't install most linux distros unless they're signed. Unfortunately, the signing process typically occurs in setup mode (when secure boot is disabled). If secure boot cannot be turned off, it's necessary to use various shim techniques to load the installer then sign everything. This blog will go over the process of doing so."
---

### Background

My school gives students a laptop they can use for their courses, which comes with Windows installed.
I, of course, immediately installed Linux.
I initially tried to run cachyOS, but the distributed ISO isn't signed for secure boot so it doesn't work OOTB.
I ended up running Fedora for about a year, until this summer when I got bored and decided I wanted to try and install cachyOS again.

The distros that support secure boot do so with a signed Microsoft shim.
This shim allows them to load their bootloaders, as firmware will only trust Microsoft/manufacturer signed binaries.
In order to get our live USB (and later install) to boot, we'll need to use the same shim that these distros use.

### Prerequisites:

- A computer you can flash a USB from that's running linux
- A USB drive (minimum one, recommended two)
- The computer you want to install cachyOS on

You'll also need to install [sbctl](https://github.com/foxboron/sbctl#available-packages) on the linux device you'll be using to flash the live USB.

### Part 1: Building the Live USB

Start by creating a new directory then downloading the cachyOS ISO.

Inside that directory, run the following commands.

```bash
mkdir ubuntu-shim
cd ubuntu-shim
# Note: the version used for the following package is from when this guide was written. You may need to use a more updated version.
curl -O https://archive.ubuntu.com/ubuntu/pool/main/s/shim-signed/shim-signed_1.59+15.8-0ubuntu2_amd64.deb
ar x shim-signed_*.deb && tar xf data.tar.xz
cd ..
```

This will download and extract the signed shim that Ubuntu uses to boot.
The two files we want from this are `shimx64.efi.signed.latest` and `mmx64.efi`, the former being our signed shim and the latter the executable for MokManager.
Next, we'll go ahead and create the signing keys we'll be using for our binaries by running `sudo sbctl create-keys`.
Now that we have our keys and the Microsoft signed shims, we need to extract the downloaded cachyOS ISO and modify it to use our new binaries.

Note that all following commands should be run in a sudo shell.

You'll also want to set the `ISO` variable, this will be used in later scripts to reference the version of the image you downloaded.
```bash
ISO=cachyos-desktop-linux-YOUR_VERSION_HERE.iso
```

```bash
# This mounts the image we downloaded
mkdir -p /mnt/iso
mount -o loop,ro "$ISO" /mnt/iso
cp -a /mnt/iso/ isoroot
umount /mnt/iso

# We also need to sign the kernels for them to be loadable
sbctl sign -s isoroot/arch/boot/x86_64/vmlinuz-linux-cachyos
sbctl sign -s isoroot/arch/boot/x86_64/vmlinuz-linux-cachyos-lts
sbctl sign -s isoroot/shellx64.efi isoroot/boot/memtest86+/memtest.efi
```

After all the kernels have been signed, we'll need to build a custom ESP image with our new bootloader executables.
In order to do so, we need the start sector and size of the ESP within the ISO.
Run `fdisk -l "$ISO"`, then record the `Start` and `Sectors` numbers for the line with type `EFI`.
Then, run the following code to extract the ESP partition and modify our binaries.

```bash
dd if="$ISO" of=esp.img bs=512 skip=REPLACE_WITH_START count=REPLACE_WITH_SECTORS
mkdir -p /mnt/esp
mount -o loop,rw esp.img /mnt/esp
mv /mnt/esp/EFI/BOOT/BOOTx64.EFI /mnt/esp/EFI/BOOT/grubx64.efi
sbctl sign -s /mnt/esp/EFI/BOOT/grubx64.efi
cp ubuntu-shim/usr/lib/shim/shimx64.efi.signed.latest /mnt/esp/EFI/BOOT/BOOTx64.EFI
cp ubuntu-shim/usr/lib/shim/mmx64.efi /mnt/esp/EFI/BOOT/mmx64.efi
openssl x509 -in /var/lib/sbctl/keys/db/db.pem -outform DER -out /mnt/esp/db-der.cer
umount /mnt/esp
```

Once we've got our modified ESP image, we need to combine it back into the main ISO.
In order to do so, we'll go ahead and read the build flags from the original image then reuse them in building our modified image.

```bash
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

Finally, we'll flash our live USB with the modified image.
Make sure you replace `sdX` with the identify of your USB drive.

```bash
dd if="${ISO%.iso}-signed.iso" of=/dev/sdX bs=4M conv=fsync
```

