package com.test.backend.dto.agent;


import lombok.Getter;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

@Getter
@Component
@RequestScope
public class ToolResultHolder {
    private Object data;
    private String toolName;

    public void capture(String toolName, Object data) {
        this.toolName = toolName;
        this.data = data;
    }

    public boolean hasResult() { return data != null; }
}