namespace CulinaryBlog.Domain.Exceptions;

public static class ErrorCodes
{
    public const string ValidationError = "VALIDATION_ERROR";
    public const string CategoryNotFound = "CATEGORY_NOT_FOUND";
    public const string CategoryNameExists = "CATEGORY_NAME_EXISTS";
    public const string RecipeNotFound = "RECIPE_NOT_FOUND";
    public const string RecipeForbidden = "RECIPE_FORBIDDEN";
    public const string RecipePublishIncomplete = "RECIPE_PUBLISH_INCOMPLETE";
    public const string ConcurrencyConflict = "RECIPE_CONCURRENCY_CONFLICT";
    public const string DuplicateValue = "DUPLICATE_VALUE";
    public const string AuthEmailExists = "AUTH_EMAIL_EXISTS";
    public const string AuthInvalidCredentials = "AUTH_INVALID_CREDENTIALS";
    public const string AuthAccountLocked = "AUTH_ACCOUNT_LOCKED";
    public const string AuthAccountDisabled = "AUTH_ACCOUNT_DISABLED";
    public const string AuthRefreshTokenExpired = "AUTH_REFRESH_TOKEN_EXPIRED";
    public const string AuthRefreshTokenRevoked = "AUTH_REFRESH_TOKEN_REVOKED";
    public const string AuthRefreshTokenInvalid = "AUTH_REFRESH_TOKEN_INVALID";
    public const string AuthGoogleTokenInvalid = "AUTH_GOOGLE_TOKEN_INVALID";
    public const string UserNotFound = "USER_NOT_FOUND";
    public const string CategoryDeleteHasRecipes = "CATEGORY_DELETE_HAS_RECIPES";
    public const string StepNotFound = "STEP_NOT_FOUND";
    public const string IngredientNotFound = "INGREDIENT_NOT_FOUND";
    public const string ImageNotFound = "IMAGE_NOT_FOUND";
    public const string FileSizeExceeded = "FILE_SIZE_EXCEEDED";
    public const string FileMimeInvalid = "FILE_MIME_INVALID";
}
