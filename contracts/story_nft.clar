;; StoryNest NFT Contract
;; A decentralized platform for creating, owning, and sharing short animated stories

;; Inline NFT Trait Definition
(define-trait nft-trait
  (
    ;; SIP-009 Required Functions
    (transfer (uint principal principal) (response bool uint))
    (get-owner (uint) (response (optional principal) uint))
    (get-token-uri (uint) (response (optional (string-utf8 256)) uint))
    (get-last-token-id () (response uint uint))
  )
)
;; SIP-009 NFT Trait Implementation

;; Errors
(define-constant ERR_UNAUTHORIZED u403)
(define-constant ERR_STORY_NOT_FOUND u404)
(define-constant ERR_MINT_LIMIT_REACHED u405)
(define-constant ERR_INVALID_STORY_METADATA u406)

;; Story Metadata Map
(define-map stories-meta 
    uint 
    {
        title: (string-utf8 100), 
        description: (string-utf8 500), 
        media-uri: (string-utf8 256), 
        creator: principal
    }
)

;; NFT Tracking
(define-non-fungible-token story-nft uint)

;; Contract Owner
(define-data-var contract-owner principal tx-sender)

;; Minting Limit
(define-data-var story-mint-limit uint u1000)
(define-data-var total-stories-minted uint u0)

;; Get contract owner
(define-read-only (get-contract-owner)
    (var-get contract-owner)
)

;; Transfer contract ownership (only current owner)
(define-public (transfer-contract-ownership (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR_UNAUTHORIZED))
        (var-set contract-owner new-owner)
        (ok true)
    )
)

;; Mint a new story NFT
(define-public (mint-story 
    (title (string-utf8 100)) 
    (description (string-utf8 500)) 
    (media-uri (string-utf8 256))
)
    (let 
        (
            (story-id (+ (var-get total-stories-minted) u1))
            (current-limit (var-get story-mint-limit))
        )
        ;; Validate story metadata
        (asserts! (> (len title) u0) (err ERR_INVALID_STORY_METADATA))
        (asserts! (> (len description) u0) (err ERR_INVALID_STORY_METADATA))
        (asserts! (> (len media-uri) u0) (err ERR_INVALID_STORY_METADATA))
        
        ;; Check mint limit
        (asserts! (< (var-get total-stories-minted) current-limit) (err ERR_MINT_LIMIT_REACHED))
        
        ;; Mint NFT
        (try! (nft-mint? story-nft story-id tx-sender))
        
        ;; Store story metadata
        (map-set stories-meta story-id {
            title: title, 
            description: description, 
            media-uri: media-uri, 
            creator: tx-sender
        })
        
        ;; Update total minted
        (var-set total-stories-minted story-id)
        
        (ok story-id)
    )
)

;; Transfer story NFT
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
    (begin
        ;; Validate sender is tx-sender
        (asserts! (is-eq tx-sender sender) (err ERR_UNAUTHORIZED))
        
        ;; Transfer NFT
        (try! (nft-transfer? story-nft token-id sender recipient))
        
        (ok true)
    )
)

;; Get story metadata by token ID
(define-read-only (get-story-meta (token-id uint))
    (map-get? stories-meta token-id)
)

;; SIP-009 Required Functions
(define-read-only (get-last-token-id)
    (var-get total-stories-minted)
)

(define-read-only (get-token-uri (token-id uint))
    (let ((story-meta (map-get? stories-meta token-id)))
        (ok (some (get media-uri (unwrap-panic story-meta)))))
)

(define-read-only (get-owner (token-id uint))
    (ok (nft-get-owner? story-nft token-id))
)