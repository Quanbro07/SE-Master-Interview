package com.test.backend.dto.zoom;

import lombok.Builder;

@Builder
public record ZoomMeetingDTO(
   String joinUrl,
   String startUrl,
   String zoomMeetingId

) {}
