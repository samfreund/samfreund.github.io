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

Note that all following commands for part 1 should be run in a root shell.

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
sbctl sign -s isoroot/shellx64.efi
sbctl sign -s isoroot/boot/memtest86+/memtest.efi
```

After all the kernels have been signed, we'll need to build a custom ESP image with our new bootloader executables. 
We'll also copy over some various scripts that will be useful later on.
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
mkdir -p /mnt/esp/sbctl-copy
cp -r /var/lib/sbctl/ /mnt/esp/sbctl-copy
openssl x509 -in /mnt/esp/sbctl-copy/keys/db/db.pem -outform DER -out /mnt/esp/db-der.cer
git clone https://github.com/samfreund/cachy-secure-boot.git
mkdir -p /mnt/esp/scripts
cp cachy-secure-boot/*.sh /mnt/esp/scripts
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
  "${ELTORITO[@]}" \
  -isohybrid-mbr isohdpfx.bin \
  -partition_cyl_align off -partition_offset 16 --mbr-force-bootable \
  -append_partition 2 0xef esp.img \
  -iso_mbr_part_type 0x00 \
  -isohybrid-gpt-basdat \
  -eltorito-alt-boot -e --interval:appended_partition_2:all:: -no-emul-boot \
  -output "${ISO%.iso}-signed.iso" isoroot
```

Finally, we'll flash our live USB with the modified image.
Make sure you replace `sdX` with the identify of your USB drive.

```bash
dd if="${ISO%.iso}-signed.iso" of=/dev/sdX bs=4M conv=fsync
```

### Part 2: Installing the Image

Go ahead and boot from the USB drive on your target device.
The first time it boots, it'll fail since you haven't enrolled the signing key yet.
You'll see it drop into MokManager, at which point you need to enroll your key.
Select *enroll key from disk*, then choose `db-der.cer`, confirm, and reboot.
This will allow our live USB to boot with our newly modified and signed kernel.

Once the live USB has booted, you're almost ready to run the normal installation helper.
Before doing so, note that the remainder of this guide assumes you're using LUKS to encrypt your root partition.
We also assume that you're erasing the disk completely.
If you choose not to do either of the above, you will have to modify some of the following instructions.
When running the installation, make sure you choose the GRUB boot manager.
Once you complete the installation helper, close the dialog and open a terminal window.

We'll start by mounting our USB so we can get access to the scripts that we copied over and our signing keys.
Note that you should still be running everything with a root shell.

```bash
mkdir -p /mntUSB
mount /dev/sdX2 /mntUSB
ls /mntUSB
```

From here on, all of the commands you'll run will be scripts from the USB.
Since you're now working in the live USB terminal, it's a lot harder to copy/paste; so this is done as a convenience.
This also means that I'll only be providing the name of the script, and then expecting you to run it.

Next, we'll unlock and mount the disk with `mount.sh`.
The mounting script assumes you're using a single NVMe SSD, if not you'll need to modify the name of the device in the script.
Note that if you've just completed the install, it may not be necessary to unlock your LUKS partition.

Once you've mounted everything, copy the scripts, signing keys, and shims into the installed filesystem with `copy.sh`.
Now that our filesystem is prepped, we can go ahead and enter it by running `arch-chroot /mnt`.

Now that we're in the chroot, we'll need to install our grub config and sign those binaries as well.
We do this by running `grub-sign.sh`.
Note, now that we're in the chroot, scripts live at `/home/FOO/scripts`.

Once we've setup our grub config and signed the binaries, we need to update our boot manager entries.
Run `efibootmgr` to see your current entries, and identify the one labeled cachyos.
This entry is from cachyOS installer we ran earlier, but it's out of date, so we need to delete it.
To delete the entry, run `efibootmgr -b XXXX -B` where XXXX is the number of the entry.
Once we've deleted that entry, we need to create an updated one.
To do so, run `efi-boot.sh`, passing in the name of your main disk (e.g. nvme0n1).

Run `efibootmgr` again, and confirm that the new entry (named cachyos) is listed first in the boot order.
Reboot, and your device should load into cachyOS.
