package com.swipeclean.core.utils

import org.junit.Assert.assertEquals
import org.junit.Test

class FileSizeFormatterTest {

    @Test
    fun `formatBytes formats 0 bytes correctly`() {
        assertEquals("0 B", FileSizeFormatter.formatBytes(0L))
        assertEquals("0 B", FileSizeFormatter.formatBytes(-50L))
    }

    @Test
    fun `formatBytes formats kilobytes correctly`() {
        assertEquals("500 B", FileSizeFormatter.formatBytes(500L))
        assertEquals("1.0 KB", FileSizeFormatter.formatBytes(1024L))
        assertEquals("2.5 KB", FileSizeFormatter.formatBytes(2560L))
    }

    @Test
    fun `formatBytes formats megabytes correctly`() {
        assertEquals("5.0 MB", FileSizeFormatter.formatBytes(5 * 1024 * 1024L))
        assertEquals("12.5 MB", FileSizeFormatter.formatBytes((12.5 * 1024 * 1024).toLong()))
    }

    @Test
    fun `formatBytes formats gigabytes correctly`() {
        assertEquals("1.5 GB", FileSizeFormatter.formatBytes((1.5 * 1024 * 1024 * 1024).toLong()))
    }
}
