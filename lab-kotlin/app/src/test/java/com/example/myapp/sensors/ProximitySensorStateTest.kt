package com.example.myapp.sensors

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProximitySensorStateTest {
    @Test
    fun isNearFromDistance_null_isFalse() {
        assertFalse(ProximitySensorState.isNearFromDistance(null))
    }

    @Test
    fun isNearFromDistance_zero_isTrue() {
        assertTrue(ProximitySensorState.isNearFromDistance(0f))
    }

    @Test
    fun isNearFromDistance_nonZero_isFalse() {
        assertFalse(ProximitySensorState.isNearFromDistance(1f))
    }
}

