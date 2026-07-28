package com.test.backend.stripe;

import com.stripe.exception.StripeException;
import com.stripe.model.Account;
import com.stripe.model.AccountLink;
import com.stripe.param.AccountCreateParams;
import com.stripe.param.AccountLinkCreateParams;
import com.test.backend.entity.user.interviewer.Interviewer;
import com.test.backend.exception.customException.ForbiddenOperationException;
import com.test.backend.exception.customException.StripeIntegrationException;
import com.test.backend.repository.InterviewerRepository;
import com.test.backend.stripe.dto.StripeLinkAccountResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@RequiredArgsConstructor
@Service
public class StripeService {

    private final InterviewerRepository interviewerRepository;

    @Value("${fe.url}")
    private String feUrl;


    public StripeLinkAccountResponse createAccountLink(Long userId) {
        Optional<Interviewer> interviewerCheck = interviewerRepository.findByInterviewerId(userId);

        if(interviewerCheck.isEmpty()) {
            throw new ForbiddenOperationException("Only interviewers can perform this action");
        }

        Interviewer interviewer = interviewerCheck.get();

        try {
            String accountId = interviewer.getStripeAccountId();

            if(accountId == null || accountId.isEmpty()) {
                // 1. Tạo 1 Connected Account(Express/Standard)
                AccountCreateParams accountParams = AccountCreateParams.builder()
                        .setType(AccountCreateParams.Type.EXPRESS)
                        .setEmail(interviewer.getUser().getEmail())
                        .setCapabilities(
                                AccountCreateParams.Capabilities.builder()
                                        // Set quyền Merchant(nhận thanh toán)
                                        .setCardPayments(
                                                AccountCreateParams.Capabilities.CardPayments
                                                        .builder()
                                                        .setRequested(true)
                                                        .build()
                                        )
                                        // Set quyền giải ngân từ platform
                                        .setTransfers(
                                                AccountCreateParams.Capabilities.Transfers
                                                        .builder()
                                                        .setRequested(true)
                                                        .build()
                                        )
                                        .build()
                        )
                        .build();

                Account account = Account.create(accountParams);
                // 1.2 Lưu account_id vào Interviewer
                interviewer.setStripeAccountId(account.getId());
                interviewerRepository.save(interviewer);

                accountId = account.getId();
            }

            String refreshUrl = feUrl + "/refresh";
            String returnUrl = feUrl + "/success";

            // 2. Tạo Account Link để lấy URL Onboarding của Stripe
            AccountLinkCreateParams accountLinkParams = AccountLinkCreateParams.builder()
                    .setAccount(accountId)
                    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                    .setRefreshUrl(refreshUrl)
                    .setReturnUrl(returnUrl)
                    .build();

            AccountLink accountLink = AccountLink.create(accountLinkParams);

            // 3. Return Response
            StripeLinkAccountResponse response = StripeLinkAccountResponse.builder()
                    .url(accountLink.getUrl())
                    .build();

            return response;

        } catch (StripeException e) {
            log.error("Stripe error", e);
            throw new StripeIntegrationException("Unable to process Stripe request.");
        }
    }
}
