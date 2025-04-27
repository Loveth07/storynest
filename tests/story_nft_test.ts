import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.2/index.ts';
import { assertEquals, assertExists } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Define an interface for story metadata to handle correct type checking
interface StoryMetadata {
    title: string;
    description: string;
    'media-uri': string;
    creator: string;
}

// Helper function to mint a story
function mintStory(
  chain: Chain, 
  sender: Account, 
  title: string = "Test Story", 
  description: string = "A short test story", 
  mediaUri: string = "https://example.com/story.mp4"
) {
  return chain.mineBlock([
    Tx.contractCall(
      "story_nft", 
      "mint-story", 
      [
        types.utf8(title), 
        types.utf8(description), 
        types.utf8(mediaUri)
      ], 
      sender.address
    )
  ]);
}

Clarinet.test({
  name: "Validate contract initialization",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    // Check initial contract owner
    let owner = chain.callReadOnlyFn("story_nft", "get-contract-owner", [], deployer.address);
    owner.result.expectPrincipal(deployer.address);
    
    // Check initial minting state
    let lastTokenId = chain.callReadOnlyFn("story_nft", "get-last-token-id", [], deployer.address);
    lastTokenId.result.expectUint(0);
  }
});

Clarinet.test({
  name: "Story Minting: Successful minting with valid metadata",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const user1 = accounts.get('wallet_1')!;
    
    // Mint a valid story
    const block = mintStory(chain, user1);
    
    // Check mint was successful
    const [receipt] = block.receipts;
    receipt.result.expectOk().expectUint(1);
    
    // Verify metadata was stored correctly
    const metaResult = chain.callReadOnlyFn(
      "story_nft", 
      "get-story-meta", 
      [types.uint(1)], 
      user1.address
    );
    
    const expectedMeta = {
      title: types.utf8("Test Story"),
      description: types.utf8("A short test story"),
      "media-uri": types.utf8("https://example.com/story.mp4"),
      creator: types.principal(user1.address)
    };
    
    // Check each part of the metadata
    const metadata = metaResult.result.expectSome();
    assertEquals(metadata.title, expectedMeta.title);
    assertEquals(metadata.description, expectedMeta.description);
    assertEquals(metadata["media-uri"], expectedMeta["media-uri"]);
    assertEquals(metadata.creator, expectedMeta.creator);
  }
});

Clarinet.test({
  name: "Story Minting: Prevent minting with invalid metadata",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const user1 = accounts.get('wallet_1')!;
    
    // Test empty title
    let block = chain.mineBlock([
      Tx.contractCall(
        "story_nft", 
        "mint-story", 
        [
          types.utf8(""),  // Empty title
          types.utf8("Description"), 
          types.utf8("https://example.com/story.mp4")
        ], 
        user1.address
      )
    ]);
    
    block.receipts[0].result.expectErr().expectUint(406);  // ERR_INVALID_STORY_METADATA
    
    // Test empty description
    block = chain.mineBlock([
      Tx.contractCall(
        "story_nft", 
        "mint-story", 
        [
          types.utf8("Title"),  
          types.utf8(""),  // Empty description
          types.utf8("https://example.com/story.mp4")
        ], 
        user1.address
      )
    ]);
    
    block.receipts[0].result.expectErr().expectUint(406);  // ERR_INVALID_STORY_METADATA
  }
});

Clarinet.test({
  name: "Story Minting: Enforce minting limit",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user1 = accounts.get('wallet_1')!;
    
    // Modify the mint limit for testing
    const limitBlock = chain.mineBlock([
      Tx.contractCall(
        "story_nft", 
        "transfer-contract-ownership", 
        [types.principal(user1.address)], 
        deployer.address
      )
    ]);
    
    // Mint the maximum allowed stories
    let block;
    const MAX_STORIES = 1000;
    
    for (let i = 1; i <= MAX_STORIES; i++) {
      block = mintStory(chain, user1, `Story ${i}`);
      block.receipts[0].result.expectOk();
    }
    
    // Try to mint one more story beyond the limit
    block = mintStory(chain, user1, "Extra Story");
    block.receipts[0].result.expectErr().expectUint(405);  // ERR_MINT_LIMIT_REACHED
  }
});

Clarinet.test({
  name: "NFT Transfer: Valid transfer between accounts",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const user1 = accounts.get('wallet_1')!;
    const user2 = accounts.get('wallet_2')!;
    
    // First, mint a story
    const mintBlock = mintStory(chain, user1);
    const tokenId = mintBlock.receipts[0].result.expectOk();
    
    // Transfer the story
    const transferBlock = chain.mineBlock([
      Tx.contractCall(
        "story_nft", 
        "transfer", 
        [tokenId, types.principal(user1.address), types.principal(user2.address)], 
        user1.address
      )
    ]);
    
    // Verify transfer was successful
    transferBlock.receipts[0].result.expectOk();
    
    // Check new owner
    const ownerResult = chain.callReadOnlyFn(
      "story_nft", 
      "get-owner", 
      [tokenId], 
      user2.address
    );
    ownerResult.result.expectOk().expectSome().expectPrincipal(user2.address);
  }
});

Clarinet.test({
  name: "NFT Transfer: Prevent unauthorized transfers",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const user1 = accounts.get('wallet_1')!;
    const user2 = accounts.get('wallet_2')!;
    const user3 = accounts.get('wallet_3')!;
    
    // Mint a story to user1
    const mintBlock = mintStory(chain, user1);
    const tokenId = mintBlock.receipts[0].result.expectOk();
    
    // Try to transfer from wrong sender
    const transferBlock = chain.mineBlock([
      Tx.contractCall(
        "story_nft", 
        "transfer", 
        [tokenId, types.principal(user1.address), types.principal(user2.address)], 
        user3.address  // Different sender
      )
    ]);
    
    // Verify transfer was prevented
    transferBlock.receipts[0].result.expectErr().expectUint(403);  // ERR_UNAUTHORIZED
  }
});

Clarinet.test({
  name: "Metadata Retrieval: Verify correct metadata storage",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const user1 = accounts.get('wallet_1')!;
    
    const title = "Unique Test Story";
    const description = "A special story for metadata testing";
    const mediaUri = "https://example.com/unique-story.mp4";
    
    // Mint a story with specific metadata
    const mintBlock = chain.mineBlock([
      Tx.contractCall(
        "story_nft", 
        "mint-story", 
        [
          types.utf8(title), 
          types.utf8(description), 
          types.utf8(mediaUri)
        ], 
        user1.address
      )
    ]);
    
    const tokenId = mintBlock.receipts[0].result.expectOk();
    
    // Retrieve metadata
    const metaResult = chain.callReadOnlyFn(
      "story_nft", 
      "get-story-meta", 
      [tokenId], 
      user1.address
    );
    
    const metadata = metaResult.result.expectSome();
    assertEquals(metadata.title, types.utf8(title));
    assertEquals(metadata.description, types.utf8(description));
    assertEquals(metadata["media-uri"], types.utf8(mediaUri));
    assertEquals(metadata.creator, types.principal(user1.address));
    
    // Check token URI
    const uriResult = chain.callReadOnlyFn(
      "story_nft", 
      "get-token-uri", 
      [tokenId], 
      user1.address
    );
    
    uriResult.result.expectOk().expectSome().expectUtf8(mediaUri);
  }
});

Clarinet.test({
  name: "Access Control: Contract ownership transfer",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user1 = accounts.get('wallet_1')!;
    
    // Attempt to transfer ownership from deployer to user1
    const transferBlock = chain.mineBlock([
      Tx.contractCall(
        "story_nft", 
        "transfer-contract-ownership", 
        [types.principal(user1.address)], 
        deployer.address
      )
    ]);
    
    // Verify ownership transfer
    transferBlock.receipts[0].result.expectOk();
    
    // Check new owner
    const ownerResult = chain.callReadOnlyFn(
      "story_nft", 
      "get-contract-owner", 
      [], 
      user1.address
    );
    
    ownerResult.result.expectPrincipal(user1.address);
    
    // Try to transfer ownership from non-owner (should fail)
    const unauthorizedTransferBlock = chain.mineBlock([
      Tx.contractCall(
        "story_nft", 
        "transfer-contract-ownership", 
        [types.principal(deployer.address)], 
        user1.address
      )
    ]);
    
    unauthorizedTransferBlock.receipts[0].result.expectErr().expectUint(403);  // ERR_UNAUTHORIZED
  }
});

Clarinet.test({
  name: "Edge Case: Minting at token limit and retrieval",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const user1 = accounts.get('wallet_1')!;
    
    // Mint a large number of stories close to the limit
    let block;
    const MAX_STORIES = 1000;
    let lastTokenId;
    
    for (let i = 1; i <= MAX_STORIES; i++) {
      block = mintStory(chain, user1, `Story ${i}`);
      lastTokenId = block.receipts[0].result.expectOk();
    }
    
    // Verify last token ID matches limit
    const finalTokenIdResult = chain.callReadOnlyFn(
      "story_nft", 
      "get-last-token-id", 
      [], 
      user1.address
    );
    
    finalTokenIdResult.result.expectUint(MAX_STORIES);
    
    // Try retrieving metadata for the last minted token
    const metaResult = chain.callReadOnlyFn(
      "story_nft", 
      "get-story-meta", 
      [lastTokenId], 
      user1.address
    );
    
    metaResult.result.expectSome();
  }
});