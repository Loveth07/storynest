# StoryNest

**Decentralized Platform for Creating, Owning, and Sharing Short Animated Stories**

StoryNest is a decentralized platform built on the Stacks blockchain that allows users to create, own, and share short animated stories as non-fungible tokens (NFTs). The platform provides a secure and transparent way for creators to monetize their work and for users to collect and trade these unique digital stories.

## Contract Architecture

The StoryNest platform is powered by a single Clarity smart contract, `story_nft.clar`, which implements the following key functionality:

1. **Story Metadata Management**: The contract maintains a `stories-meta` map that stores the title, description, media URI, and creator for each story NFT.
2. **Minting and Ownership Transfer**: The contract allows minting new story NFTs, with validation checks for metadata and a configurable minting limit. It also supports transferring contract ownership to a new principal.
3. **NFT Transfer**: The contract provides a `transfer` function that allows the owner of a story NFT to transfer it to a new recipient.
4. **Metadata Retrieval**: The contract offers read-only functions to retrieve the story metadata and token URI for a given NFT.
5. **SIP-009 Compliance**: The contract implements the required SIP-009 functions for getting the last minted token ID, retrieving the token URI, and getting the owner of a token.

### Data Structures

The contract maintains the following key data structures:

1. **`stories-meta` Map**: Stores the title, description, media URI, and creator for each story NFT.
2. **`story-nft` Non-Fungible Token**: Represents the individual story NFTs.
3. **`contract-owner` Data Var**: Stores the principal that owns the StoryNest contract.
4. **`story-mint-limit` Data Var**: Stores the maximum number of story NFTs that can be minted.
5. **`total-stories-minted` Data Var**: Tracks the total number of story NFTs that have been minted.

### Public Functions

The contract exposes the following public functions:

1. **`mint-story`**: Allows a user to mint a new story NFT with the provided metadata (title, description, media URI).
2. **`transfer`**: Allows the owner of a story NFT to transfer it to a new recipient.
3. **`get-story-meta`**: Retrieves the metadata (title, description, media URI, creator) for a given story NFT.
4. **`transfer-contract-ownership`**: Allows the current contract owner to transfer ownership to a new principal.

### Security Considerations

The contract includes the following security measures:

1. **Metadata Validation**: The `mint-story` function validates that the provided title, description, and media URI are not empty, ensuring the integrity of the story metadata.
2. **Minting Limit**: The contract enforces a configurable limit on the number of story NFTs that can be minted, preventing excessive minting.
3. **Access Control**: The `transfer-contract-ownership` function can only be called by the current contract owner, ensuring that ownership can only be transferred by an authorized principal.
4. **Unauthorized Transfer Prevention**: The `transfer` function checks that the transaction sender is the current owner of the story NFT, preventing unauthorized transfers.

## Installation & Setup

To use the StoryNest platform, you'll need to have the following prerequisites installed:

- Clarinet: A development tool for building and testing Clarity smart contracts.

To set up the project, follow these steps:

1. Clone the StoryNest repository.
2. Install Clarinet by following the [official installation guide](https://github.com/clarinet-tool/clarinet#installation).
3. Run `clarinet check` to ensure the project is configured correctly.

## Usage Guide

Here are some examples of how to interact with the StoryNest contract:

### Minting a New Story

```javascript
// Mint a new story NFT
const title = "My Animated Story";
const description = "A short, whimsical animation about a day in the life.";
const mediaUri = "https://example.com/story.mp4";

const mintResult = await chain.submitTransaction(
  "story_nft",
  "mint-story",
  [types.utf8(title), types.utf8(description), types.utf8(mediaUri)],
  wallet1.address
);

const tokenId = mintResult.expectOk();
console.log(`Minted new story NFT with ID: ${tokenId}`);
```

### Transferring a Story NFT

```javascript
// Transfer a story NFT to a new owner
const tokenId = 123;
const sender = wallet1.address;
const recipient = wallet2.address;

const transferResult = await chain.submitTransaction(
  "story_nft",
  "transfer",
  [types.uint(tokenId), types.principal(sender), types.principal(recipient)],
  sender
);

transferResult.expectOk();
console.log(`Transferred story NFT ${tokenId} to ${recipient}`);
```

### Retrieving Story Metadata

```javascript
// Get metadata for a story NFT
const tokenId = 123;

const metadataResult = await chain.callReadOnlyFunction(
  "story_nft",
  "get-story-meta",
  [types.uint(tokenId)],
  wallet1.address
);

const metadata = metadataResult.expectSome();
console.log(`Story Title: ${metadata.title}`);
console.log(`Story Description: ${metadata.description}`);
console.log(`Story Media URI: ${metadata["media-uri"]}`);
console.log(`Story Creator: ${metadata.creator}`);
```

## Testing

The StoryNest project includes a comprehensive test suite for the `story_nft.clar` contract, located in the `tests/story_nft_test.ts` file. These tests cover the following scenarios:

1. Contract Initialization
2. Successful Minting
3. Invalid Minting
4. Minting Limit
5. NFT Transfer
6. Metadata Retrieval
7. Access Control
8. Edge Cases

To run the tests, use the following command:

```
clarinet test
```

The test suite ensures the contract behaves as expected and covers the core functionality of the StoryNest platform.

## Security Considerations

The StoryNest contract includes several security measures to protect users and their story NFTs:

1. **Metadata Validation**: The contract validates that story metadata (title, description, media URI) is not empty, ensuring the integrity of the stored information.
2. **Minting Limit**: The contract enforces a configurable limit on the number of story NFTs that can be minted, preventing excessive minting and potential abuse.
3. **Access Control**: The contract ownership can only be transferred by the current owner, ensuring that the contract's administration is properly controlled.
4. **Unauthorized Transfer Prevention**: The contract checks that the transaction sender is the current owner of a story NFT before allowing a transfer, preventing unauthorized transfers.

While these measures help to secure the StoryNest platform, users should always exercise caution when interacting with any decentralized application and review the contract code and documentation thoroughly.
