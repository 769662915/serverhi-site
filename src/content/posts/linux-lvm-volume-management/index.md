---
title: "Extend an ext4 logical volume and verify the data on it"
description: "Follow an LVM volume from the physical device to its ext4 mount. Check free extents, grow the right layers and verify capacity and a file checksum."
pubDate: 2026-04-09
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Linux LVM Volume Management: Resize, Snapshots, and Migration Without Downtime"
category: "linux"
tags: [Linux, LVM, Storage, Disk Management]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

A volume group can have free extents while an application sees a full filesystem. LVM allocates space to the logical volume (LV); ext4 accounts for the blocks available to files. A larger LV alone need not change the free space reported by `df`.

## Trace the mount before allocating anything

This worked example assumes a disposable Linux VM with an **existing** test LV named `vg_lab/data`, ext4 mounted at `/mnt/lvm-lab`, and at least 128 MiB free in the volume group. Use a separate lab LV. Confirm the filesystem type and source before choosing a resize tool.

```bash
findmnt -no SOURCE,FSTYPE,TARGET /mnt/lvm-lab
sudo pvs -o pv_name,vg_name,pv_size,pv_free
sudo vgs -o vg_name,vg_size,vg_free
sudo lvs -o vg_name,lv_name,lv_size,devices
df -hT /mnt/lvm-lab
```

For example, if `df` shows 240 MiB on the mount and the VG still has 256 MiB free, a 128 MiB extension fits. If `vg_free` is zero, stop and plan additional capacity. A brand-new virtual disk showing up in `lsblk` does not automatically put any extents in this VG.

## Extend and verify in the lab

Confirm that the filesystem is mounted read-write, create a small sample, and retain its checksum outside the volume. Obtain an independent backup for real data. The two commands after the checksum make the allocation steps visible.

```bash
printf 'lvm rehearsal\n' | sudo tee /mnt/lvm-lab/probe.txt >/dev/null
sha256sum /mnt/lvm-lab/probe.txt > /tmp/lvm-lab-probe.sha256
sudo lvextend -L +128M /dev/vg_lab/data
sudo resize2fs /dev/vg_lab/data
sudo lvs -o lv_name,lv_size /dev/vg_lab/data
df -hT /mnt/lvm-lab
sha256sum -c /tmp/lvm-lab-probe.sha256
```

The plus sign requests an increment. Each repeat allocates another increment. If the LV grew but the filesystem did not, check the first step against `lvs` before retrying the **filesystem** operation. The resulting usable capacity will differ from the raw LV size because of filesystem metadata.

## Where this procedure ends

XFS uses a different grow tool and takes the mounted filesystem as its argument. Thin pools require checking both data and metadata usage. Shrinking needs a filesystem-specific procedure and may be unsupported. An LVM snapshot shares storage with the origin and can run out of space; do not treat it as your independent recovery copy. For a failed maintenance window, recover to a separate verified copy instead of trying to undo a grow by reducing the LV. [lvextend manual](https://man7.org/linux/man-pages/man8/lvextend.8.html) · [resize2fs manual](https://man7.org/linux/man-pages/man8/resize2fs.8.html) · [Recovery rehearsal](/posts/backup-strategies/)

## Verification on November 25, 2026

On Ubuntu 24.04.5, a 512 MiB disposable loop device held an ext4 LV. The LV grew from 128 to 256 MiB. Both `df` and `lvs` showed the increase, and the SHA-256 check of the original probe file passed after resizing.
