package com.attendance.system.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class AttendanceException extends RuntimeException {
    public AttendanceException(String message) {
        super(message);
    }
}
